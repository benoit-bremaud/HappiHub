"""Opt-in regression against real Nginx and the current Express application.

Requires prebuilt HappiHub server/client images, Docker and OpenSSL. Creates only
labelled disposable containers on an internal network, with no host ports, real
credentials or database. Session storage is a fake boundary; ingress and limits
are real. Never discovered by the non-Docker quality collector test suite.
"""

import argparse
import ipaddress
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
import uuid


ROOT = Path(__file__).resolve().parents[2]
LABEL = "happihub.ingress-test"

# Mount current application modules over the prebuilt image's dependencies only.
API_FIXTURE = r"""
import { randomBytes } from 'node:crypto';
import session from '/app/node_modules/express-session/index.js';
import { createApp } from '/app/app.js';
const app = createApp({
  production: true, sessionSecret: randomBytes(32).toString('hex'),
  cookieName: '__Host-happihub.sid', origin: 'https://happihub.example',
  trustedProxy: process.env.NGINX_IP,
}, { store: new session.MemoryStore() });
app.get('/api/fixture/identity', (req, res) => res.json({
  ip: req.ip, secure: req.secure, host: req.hostname,
  forwardedFor: req.get('X-Forwarded-For'),
  realIP: req.get('X-Real-IP') || null, forwarded: req.get('Forwarded') || null,
}));
app.listen(5000, '0.0.0.0');
"""

EDGE_FIXTURE = r"""
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
const edge = https.createServer({
  key: readFileSync('/fixture/key.pem'), cert: readFileSync('/fixture/cert.pem'),
}, (req, res) => {
  const headers = { ...req.headers, host: 'happihub.example',
    'x-forwarded-for': req.socket.remoteAddress.replace(/^::ffff:/, ''),
    'x-forwarded-proto': 'https', 'x-forwarded-host': 'happihub.example' };
  delete headers['x-real-ip']; delete headers.forwarded;
  const upstream = http.request({ host: process.env.NGINX_IP, port: 8080,
    path: req.url, method: req.method, headers }, (response) => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(upstream);
});
edge.listen(8443, '::');
"""

REQUEST_FIXTURE = r"""
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
const options = JSON.parse(readFileSync(0, 'utf8'));
const transport = options.tls ? https : http;
const results = [];
for (let i = 0; i < (options.count || 1); i++) {
  results.push(await new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (options.rotateSpoof) headers['x-forwarded-for'] = `192.0.2.${i + 1}`;
    const req = transport.request({
      host: options.host, port: options.port, path: options.path,
      method: options.method || 'GET', headers,
      // Trust only this fixture's ephemeral certificate; normal TLS validation remains on.
      ca: options.tls ? readFileSync('/fixture/cert.pem') : undefined,
      servername: options.tls ? 'happihub.example' : undefined,
      timeout: 3000,
    }, (res) => {
      let body = ''; res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  }));
}
process.stdout.write(JSON.stringify(results));
"""


def command(*args, input_text=None, check=True):
    """Execute fixed argument arrays; never invoke a shell or print request data."""
    return subprocess.run(args, input=input_text, text=True, capture_output=True,
                          timeout=120, check=check)


class IngressTests(unittest.TestCase):
    """Exercise each trust boundary, then compose it with application quotas."""

    @classmethod
    def setUpClass(cls):
        cls.name = "happihub-ingress-" + uuid.uuid4().hex[:12]
        cls.containers = []
        cls.network_created = False
        cls.temp = tempfile.TemporaryDirectory(prefix=cls.name + "-")
        cls.addClassCleanup(cls.cleanup)
        cls.folder = Path(cls.temp.name)
        cls.folder.chmod(0o755)
        cls.server_image = command("docker", "image", "inspect", ARGS.server_image,
                                   "--format", "{{.Id}}").stdout.strip()
        cls.nginx_image = command("docker", "image", "inspect", ARGS.nginx_image,
                                  "--format", "{{.Id}}").stdout.strip()
        command("docker", "network", "create", "--internal", "--ipv6",
                "--subnet", "fd" + uuid.uuid4().hex[:2] + ":" + uuid.uuid4().hex[:4] + ":" +
                uuid.uuid4().hex[:4] + "::/64", "--label", f"{LABEL}={cls.name}", cls.name)
        cls.network_created = True
        network = json.loads(command("docker", "network", "inspect", cls.name).stdout)[0]
        networks = [ipaddress.ip_network(item["Subnet"]) for item in network["IPAM"]["Config"]]
        cls.v4 = next(net for net in networks if net.version == 4)
        cls.v6 = next(net for net in networks if net.version == 6)
        cls.api_ip, cls.nginx_ip, cls.edge_ip, cls.client_a_ip, cls.client_b_ip = [
            str(cls.v4[index]) for index in range(2, 7)]
        cls.edge_v6 = str(cls.v6[4])
        cls.trust = cls.folder / "trusted-ingress.conf"
        cls.trust.write_text(f"set_real_ip_from {cls.edge_ip};\n")
        for filename, content in (("api.mjs", API_FIXTURE), ("edge.mjs", EDGE_FIXTURE)):
            (cls.folder / filename).write_text(content)
        command("openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                "-keyout", str(cls.folder / "key.pem"), "-out", str(cls.folder / "cert.pem"),
                "-days", "1", "-subj", "/CN=happihub.example",
                "-addext", "subjectAltName=DNS:happihub.example")
        # Synthetic disposable key only. The real user's secret directories are never mounted.
        (cls.folder / "key.pem").chmod(0o444)
        source = ["app.js", "package.json", "config", "controllers", "middleware",
                  "models", "queries", "routes", "utils", "validation"]
        mounts = []
        for entry in source:
            mounts += ["--mount", f"type=bind,src={ROOT / 'server' / entry},dst=/app/{entry},readonly"]
        cls.api = cls.start("api", 2, cls.server_image, "node", ["/fixture/api.mjs"],
                            ["--network-alias", "server", "-e", f"NGINX_IP={cls.nginx_ip}", *mounts])
        cls.nginx = cls.start("nginx", 3, cls.nginx_image, "nginx", ["-g", "daemon off;"], [
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m,mode=1777",
            "--mount", f"type=bind,src={ROOT / 'client/nginx.conf'},dst=/etc/nginx/conf.d/default.conf,readonly",
            "--mount", f"type=bind,src={cls.trust},dst=/etc/nginx/happihub/trusted-ingress.conf,readonly"])
        cls.edge = cls.start("edge", 4, cls.server_image, "node", ["/fixture/edge.mjs"],
                             ["-e", f"NGINX_IP={cls.nginx_ip}"])
        cls.client_a = cls.start("client-a", 5, cls.server_image, "node", ["-e", "setInterval(() => {}, 1000)"])
        cls.client_b = cls.start("client-b", 6, cls.server_image, "node", ["-e", "setInterval(() => {}, 1000)"])
        for _ in range(30):
            try:
                if cls.call(cls.client_a, cls.edge_ip, 8443, "/", tls=True)[0]["status"] == 200:
                    return
            except subprocess.CalledProcessError:
                pass
            time.sleep(0.2)
        raise RuntimeError("Disposable ingress fixture did not become ready")

    @classmethod
    def start(cls, suffix, index, image, entrypoint, args, extra=()):
        name = cls.name + "-" + suffix
        command("docker", "create", "--name", name, "--label", f"{LABEL}={cls.name}",
                "--network", cls.name, "--ip", str(cls.v4[index]), "--ip6", str(cls.v6[index]),
                "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--read-only",
                "--memory", "256m", "--pids-limit", "128",
                "--mount", f"type=bind,src={cls.folder},dst=/fixture,readonly",
                *extra, "--entrypoint", entrypoint, image, *args)
        cls.containers.append(name)
        command("docker", "start", name)
        return name

    @classmethod
    def call(cls, sender, host, port, path, **options):
        payload = dict(host=host, port=port, path=path, **options)
        result = command("docker", "exec", "-i", sender, "node", "--input-type=module", "-e",
                         REQUEST_FIXTURE, input_text=json.dumps(payload))
        return json.loads(result.stdout)

    @classmethod
    def cleanup(cls):
        """Retire only resources created by this invocation and still bearing its label."""
        failures = []
        for kind, names in (("container", reversed(cls.containers)),
                            ("network", [cls.name] if cls.network_created else [])):
            for name in names:
                result = command("docker", kind, "inspect", name, check=False)
                if result.returncode:
                    failures.append(name)
                    continue
                item = json.loads(result.stdout)[0]
                labels = item.get("Config", item).get("Labels", {}) or {}
                if labels.get(LABEL) != cls.name:
                    failures.append(name)
                    continue
                args = ["docker", kind, "rm"] + (["-f"] if kind == "container" else []) + [name]
                if command(*args, check=False).returncode:
                    failures.append(name)
        if failures:
            raise RuntimeError("Fixture cleanup requires inspection: " + ", ".join(failures))
        cls.temp.cleanup()

    def test_identity_and_header_spoofing(self):
        spoof = {"x-forwarded-for": "192.0.2.99, 198.51.100.9",
                 "x-forwarded-host": "attacker.example", "x-forwarded-proto": "http",
                 "x-real-ip": "192.0.2.98", "forwarded": "for=192.0.2.97;proto=http"}
        for sender, expected in [(self.client_a, self.client_a_ip), (self.client_b, self.client_b_ip)]:
            response = self.call(sender, self.edge_ip, 8443, "/api/fixture/identity", tls=True, headers=spoof)[0]
            self.assertEqual(response["status"], 200)
            self.assertEqual(json.loads(response["body"]), {
                "ip": expected, "forwardedFor": expected, "secure": True,
                "host": "happihub.example", "realIP": None, "forwarded": None})

    def test_untrusted_and_invalid_forwarding(self):
        direct = self.call(self.client_a, self.nginx_ip, 8080, "/api/fixture/identity",
                           headers={"x-forwarded-for": "192.0.2.10"})[0]
        self.assertEqual(direct["status"], 403)
        for value in [None, "not-an-ip", "192.0.2.10, invalid", self.edge_ip]:
            headers = {} if value is None else {"x-forwarded-for": value}
            response = self.call(self.edge, self.nginx_ip, 8080, "/api/fixture/identity", headers=headers)[0]
            self.assertEqual(response["status"], 403)
        self.assertEqual(self.call(self.client_a, self.nginx_ip, 8080, "/")[0]["status"], 200)

    def test_canonical_ipv6_and_untrusted_direct_api(self):
        response = self.call(self.edge, self.nginx_ip, 8080, "/api/fixture/identity",
                             headers={"x-forwarded-for": "2001:db8:1::10"})[0]
        self.assertEqual(response["status"], 200)
        self.assertEqual(json.loads(response["body"])["ip"], "2001:db8:1::10")
        response = self.call(self.client_a, self.api_ip, 5000, "/api/fixture/identity",
                             headers={"x-forwarded-for": "192.0.2.10", "x-forwarded-proto": "https"})[0]
        actual = json.loads(response["body"])
        self.assertEqual(actual["ip"].removeprefix("::ffff:"), self.client_a_ip)
        self.assertFalse(actual["secure"])

    def test_login_quota_cannot_be_bypassed_by_rotating_headers(self):
        responses = self.call(self.client_a, self.edge_ip, 8443, "/api/users/login", tls=True,
                              method="POST", count=21, rotateSpoof=True)
        # No CSRF fixture: the real limiter runs first, then the real CSRF guard rejects.
        self.assertEqual([r["status"] for r in responses], [403] * 20 + [429])
        self.assertIn("retry-after", responses[-1]["headers"])
        other = self.call(self.client_b, self.edge_ip, 8443, "/api/users/login", tls=True, method="POST")[0]
        self.assertEqual(other["status"], 403)

    def test_bootstrap_quota_and_secure_cookie(self):
        responses = self.call(self.client_a, self.edge_ip, 8443, "/api/users/session", tls=True,
                              headers={"origin": "https://happihub.example"}, count=121)
        self.assertEqual([r["status"] for r in responses], [200] * 120 + [429])
        cookie = responses[0]["headers"]["set-cookie"][0]
        for flag in ["__Host-happihub.sid=", "HttpOnly", "Secure", "SameSite=Lax", "Path=/"]:
            self.assertIn(flag, cookie)
        self.assertNotIn("Domain=", cookie)
        other = self.call(self.client_b, self.edge_ip, 8443, "/api/users/session", tls=True,
                          headers={"origin": "https://happihub.example"})[0]
        self.assertEqual(other["status"], 200)

    def test_trust_file_validation_and_exact_ipv6_peer(self):
        original = self.trust.read_text()
        try:
            self.trust.write_text("set_real_ip_from not-an-address;\n")
            self.assertNotEqual(command("docker", "exec", self.nginx, "nginx", "-t", check=False).returncode, 0)
            for trust_text, destination, headers, expected in [
                ("", self.nginx_ip, {"x-forwarded-for": "192.0.2.10"}, 403),
                (f"set_real_ip_from {self.edge_v6};\n", str(self.v6[3]),
                 {"x-forwarded-for": "2001:db8:3::10"}, 200),
            ]:
                self.trust.write_text(trust_text)
                command("docker", "exec", self.nginx, "nginx", "-t")
                command("docker", "exec", self.nginx, "nginx", "-s", "reload")
                for _ in range(30):
                    response = self.call(self.edge, destination, 8080, "/api/fixture/identity", headers=headers)[0]
                    if response["status"] == expected:
                        break
                    time.sleep(0.1)
                self.assertEqual(response["status"], expected)
                if expected == 200:
                    self.assertEqual(json.loads(response["body"])["ip"], "2001:db8:3::10")
        finally:
            self.trust.write_text(original)
            command("docker", "exec", self.nginx, "nginx", "-t")
            command("docker", "exec", self.nginx, "nginx", "-s", "reload")
            for _ in range(30):
                response = self.call(self.edge, self.nginx_ip, 8080, "/api/fixture/identity",
                                     headers={"x-forwarded-for": "192.0.2.10"})[0]
                if response["status"] == 200:
                    break
                time.sleep(0.1)
            self.assertEqual(response["status"], 200)

    def test_required_file_and_no_published_fixture_ports(self):
        result = command("docker", "run", "--rm", "--pull=never", "--network", self.name,
                         "--label", f"{LABEL}={self.name}", "--cap-drop", "ALL",
                         "--security-opt", "no-new-privileges", "--read-only",
                         "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m,mode=1777",
                         "--mount", f"type=bind,src={ROOT / 'client/nginx.conf'},dst=/etc/nginx/conf.d/default.conf,readonly",
                         "--entrypoint", "nginx", self.nginx_image, "-t", check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("trusted-ingress.conf", result.stderr)
        for name in self.containers:
            config = json.loads(command("docker", "inspect", name).stdout)[0]
            self.assertFalse(config["HostConfig"]["PortBindings"])
            self.assertNotEqual(command("docker", "exec", name, "id", "-u").stdout.strip(), "0")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--server-image", required=True, help="Prebuilt HappiHub runtime server image")
    parser.add_argument("--nginx-image", required=True, help="Prebuilt HappiHub runtime client image")
    ARGS = parser.parse_args()
    unittest.main(argv=[__file__], verbosity=2)
