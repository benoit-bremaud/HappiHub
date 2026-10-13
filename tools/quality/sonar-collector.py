#!/usr/bin/env python3
"""Collect only verified main-push coverage; never execute repository workflows locally."""

import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tempfile
import time
import urllib.parse
import uuid
import zipfile

REPOSITORY = 'benoit-bremaud/HappiHub'
REPOSITORY_ID = 825107157
WORKFLOW = '.github/workflows/quality-tests.yml'
NETWORK = 'happihub-sonar-internal'
IMAGE = ('sonarsource/sonar-scanner-cli@sha256:'
         '23ca0f137965d9dff2198074043fd48d386280bc5d0ccac8c8349cea4cf096a9')
REPORTS = {'server/coverage/lcov.info', 'client/coverage/lcov.info'}
ARCHIVE_FILES = REPORTS | {'manifest.json'}
MAX_ARCHIVE = 50 * 1024 * 1024
SHA = re.compile(r'[0-9a-f]{40}')


class BoundaryError(Exception):
    """Input failed a trust-boundary or operational precondition."""


def run_key(run):
    """Bind processing to an immutable revision and a specific workflow attempt."""
    return f"{run['id']}:{run.get('run_attempt', 1)}:{run['head_sha']}"


def trusted_run(run, workflow_id, activation):
    """Workflow success alone does not establish repository/branch provenance."""
    return (run.get('repository', {}).get('id') == REPOSITORY_ID
            and run.get('head_repository', {}).get('id') == REPOSITORY_ID
            and run.get('event') == 'push'
            and run.get('head_branch') == 'main'
            and run.get('workflow_id') == workflow_id
            and run.get('path') == WORKFLOW
            and bool(SHA.fullmatch(run.get('head_sha', '')))
            and run.get('created_at', '') >= activation)


def eligible_run(run, workflow_id, activation):
    return (trusted_run(run, workflow_id, activation)
            and run.get('status') == 'completed'
            and run.get('conclusion') == 'success')


def validate_manifest(manifest, run):
    expected = {'repository_id': REPOSITORY_ID, 'head_sha': run['head_sha'],
                'run_id': run['id'], 'run_attempt': run.get('run_attempt', 1)}
    if manifest != expected:
        raise BoundaryError('Coverage manifest does not match the eligible run')


def unpack_coverage(data, destination, run, digest=None):
    """Extract an exact file allowlist after bounded ZIP and provenance validation."""
    if len(data) > MAX_ARCHIVE:
        raise BoundaryError('Coverage download exceeds limit')
    if digest and digest != 'sha256:' + hashlib.sha256(data).hexdigest():
        raise BoundaryError('Coverage artifact digest mismatch')
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            members = archive.infolist()
            names = [member.filename for member in members]
            if len(names) != len(ARCHIVE_FILES) or set(names) != ARCHIVE_FILES:
                raise BoundaryError('Coverage archive contains unexpected or duplicate entries')
            if sum(member.file_size for member in members) > MAX_ARCHIVE:
                raise BoundaryError('Expanded coverage exceeds limit')
            payload = {}
            for member in members:
                limit = 65536 if member.filename == 'manifest.json' else 10 * 1024 * 1024
                if (member.file_size > limit or member.flag_bits & 1
                        or stat.S_ISLNK(member.external_attr >> 16)):
                    raise BoundaryError('Unsafe coverage member')
                with archive.open(member) as source:
                    content = source.read(limit + 1)
                if len(content) > limit or len(content) != member.file_size:
                    raise BoundaryError('Coverage size mismatch')
                payload[member.filename] = content
            validate_manifest(json.loads(payload['manifest.json']), run)
    except (zipfile.BadZipFile, UnicodeError, json.JSONDecodeError) as error:
        raise BoundaryError('Invalid coverage archive') from error
    for name, content in payload.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)


def normalize_lcov(report, project):
    """Resolve Jest's package-relative paths without accepting external files."""
    package = 'server' if report.parts[-3] == 'server' else 'client'
    lines = report.read_text(encoding='utf-8').splitlines()
    records = 0
    for index, line in enumerate(lines):
        if len(line) > 65536:
            raise BoundaryError('LCOV record exceeds limit')
        if not line.startswith('SF:'):
            continue
        path = PurePosixPath(line[3:])
        if (path.is_absolute() or '..' in path.parts or '\\' in str(path)
                or not path.parts or ':' in str(path)):
            raise BoundaryError('Unsafe LCOV source path')
        relative = path if path.parts[0] == package else PurePosixPath(package) / path
        if package == 'client' and relative.parts[:2] != ('client', 'src'):
            raise BoundaryError('LCOV source outside client production root')
        target = project / relative
        if not target.is_file() or target.is_symlink():
            raise BoundaryError('LCOV source does not exist in the exact revision')
        if not target.resolve().is_relative_to(project.resolve()):
            raise BoundaryError('LCOV source escapes checkout')
        lines[index] = 'SF:' + str(relative)
        records += 1
    if not records:
        raise BoundaryError('Coverage report has no source records')
    report.write_text('\n'.join(lines) + '\n')


def command(arguments, *, cwd=None, env=None, timeout=120, output=None):
    """Use argv without shell expansion; hide process output that may contain secrets."""
    try:
        result = subprocess.run(arguments, cwd=cwd, env=env, timeout=timeout,
                                stdin=subprocess.DEVNULL, stdout=output or subprocess.PIPE,
                                stderr=subprocess.PIPE, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise BoundaryError('Required command unavailable or timed out') from error
    if result.returncode:
        raise BoundaryError(f'{Path(arguments[0]).name} failed (exit {result.returncode})')
    return result.stdout


def github_env(token):
    return {'PATH': os.environ.get('PATH', '/usr/bin:/bin'),
            'HOME': '/nonexistent', 'GH_TOKEN': token, 'GH_HOST': 'github.com',
            'GH_PROMPT_DISABLED': '1', 'GH_CONFIG_DIR': '/nonexistent',
            'GH_PAGER': 'cat'}


def api(path, token, *, method='GET', fields=None):
    args = ['gh', 'api', '--hostname', 'github.com', '--method', method, path]
    for key, value in (fields or {}).items():
        args.extend(['-f', f'{key}={value}'])
    return json.loads(command(args, env=github_env(token)))


def publish_status(run, state, description, token):
    """Publish only the fixed context on the verified revision, never a newer HEAD."""
    api(f'repos/{REPOSITORY}/statuses/{run["head_sha"]}', token, method='POST', fields={
        'state': state, 'context': 'happihub/sonarqube',
        'description': description[:140]})


def save_state(path, state):
    """Atomic durable state supports restart without losing completed scan outcomes."""
    temporary = path.with_suffix('.new')
    with temporary.open('w') as stream:
        json.dump(state, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def read_credential(name, config):
    directory = os.environ.get('CREDENTIALS_DIRECTORY')
    path = Path(directory) / name if directory else Path(config[name.replace('-', '_') + '_file'])
    if path.is_symlink() or path.stat().st_mode & 0o077:
        raise BoundaryError('Credential must be a private regular file')
    value = path.read_text().strip()
    if not value or '\n' in value:
        raise BoundaryError('Credential missing or malformed')
    return value


def verify_network():
    """Fail closed if the scanner network loses its isolated topology."""
    network = json.loads(command(['docker', 'network', 'inspect', NETWORK]))[0]
    containers = network.get('Containers', {})
    if (network.get('Driver') != 'bridge' or not network.get('Internal') or network.get('EnableIPv6')
            or network.get('Options', {}).get('com.docker.network.bridge.gateway_mode_ipv4') != 'isolated'
            or len(containers) != 1
            or next(iter(containers.values())).get('Name') != 'sonarqube'):
        raise BoundaryError('Scanner network is not the approved isolated Sonar-only topology')
    server = json.loads(command(['docker', 'inspect', 'sonarqube']))[0]
    if server.get('HostConfig', {}).get('Privileged'):
        raise BoundaryError('Unexpected privileged Sonar container')


def scanner_args(project, name, sha):
    return ['docker', 'run', '--name', name, '--network', NETWORK,
            '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            '--read-only', '--pids-limit', '256', '--memory', '2g', '--cpus', '2',
            '--tmpfs', '/tmp:rw,nosuid,nodev,size=768m,uid=1000,gid=1000',
            '--tmpfs', '/opt/sonar-scanner/.sonar:rw,nosuid,nodev,size=768m,uid=1000,gid=1000',
            '--mount', f'type=bind,src={project},dst=/usr/src,readonly',
            '--mount', f'type=bind,src={project.parent / "analysis-state"},dst=/analysis',
            '--env', 'SONAR_TOKEN', '--env', 'SONAR_HOST_URL=http://sonarqube:9000',
            IMAGE, '-Dsonar.projectBaseDir=/usr/src',
            '-Dsonar.working.directory=/analysis', f'-Dsonar.scm.revision={sha}',
            '-Dsonar.projectVersion=1.0.0', '-Dsonar.qualitygate.wait=true',
            '-Dsonar.qualitygate.timeout=300']


def sonar_api(endpoint, token):
    """Read analysis status over the approved local segment without credential argv."""
    if not endpoint.startswith(('/api/ce/task?', '/api/qualitygates/project_status?')):
        raise BoundaryError('Unexpected Sonar API endpoint')
    verify_network()
    script = ('import base64,json,os,sys,urllib.request; '
              'request=urllib.request.Request("http://sonarqube:9000"+sys.argv[1]); '
              'request.add_header("Authorization","Basic "+base64.b64encode('
              '(os.environ["SONAR_TOKEN"]+":").encode()).decode()); '
              'print(json.dumps(json.load(urllib.request.urlopen(request,timeout=15))))')
    args = ['docker', 'run', '--rm', '--network', NETWORK, '--user', '1000:1000',
            '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            '--pids-limit', '32', '--memory', '128m', '--env', 'SONAR_TOKEN',
            '--entrypoint', 'python3', IMAGE, '-c', script, endpoint]
    environment = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'SONAR_TOKEN': token}
    return json.loads(command(args, env=environment, timeout=30))


def container_task(name, directory, analysis_directory=None):
    if not re.fullmatch(r'happihub-scan-[0-9a-f]{32}', name):
        raise BoundaryError('Unexpected scanner container identity')
    report = directory / (name + '.task')
    if not report.exists():
        if analysis_directory is None:
            raise BoundaryError('No durable scanner task record')
        source = Path(analysis_directory) / 'report-task.txt'
        if (not source.resolve().is_relative_to(directory.resolve()) or source.is_symlink()
                or not source.is_file() or source.stat().st_size > 65536):
            raise BoundaryError('Invalid scanner working directory task report')
        shutil.copyfile(source, report)
    if report.is_symlink() or report.stat().st_size > 65536:
        raise BoundaryError('Invalid scanner task report')
    fields = dict(line.split('=', 1) for line in report.read_text().splitlines() if '=' in line)
    task = fields.get('ceTaskId', '')
    if fields.get('projectKey') != 'happihub' or not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', task):
        raise BoundaryError('Task report does not identify HappiHub')
    return task


def task_result(task_id, token):
    task = sonar_api('/api/ce/task?' + urllib.parse.urlencode({'id': task_id}), token)['task']
    if task.get('componentKey') != 'happihub':
        raise BoundaryError('Computed task belongs to a different project')
    if task['status'] in ('PENDING', 'IN_PROGRESS'):
        return None
    if task['status'] != 'SUCCESS':
        return {'state': 'error', 'description': 'SonarQube analysis task failed', 'task_id': task_id}
    analysis_id = task['analysisId']
    gate = sonar_api('/api/qualitygates/project_status?' + urllib.parse.urlencode({'analysisId': analysis_id}), token)
    status = gate['projectStatus']['status']
    if status not in ('OK', 'ERROR'):
        raise BoundaryError('Quality gate has no definitive result')
    return {'state': 'success' if status == 'OK' else 'failure',
            'description': 'SonarQube gate passed' if status == 'OK' else 'SonarQube gate failed',
            'analysis_id': analysis_id, 'task_id': task_id}


def retire_container(name):
    if not re.fullmatch(r'happihub-scan-[0-9a-f]{32}', name):
        raise BoundaryError('Refusing cleanup of an unrelated container')
    result = subprocess.run(['docker', 'rm', '--force', name], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, check=False, timeout=30)
    if result.returncode and b'No such container' not in result.stderr:
        raise BoundaryError('Could not retire the scanner container')


def export_source(project, sha):
    """Clone public source without personal Git config, hooks, submodules or scripts."""
    environment = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOME': '/nonexistent',
                   'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
                   'GIT_TERMINAL_PROMPT': '0', 'GIT_LFS_SKIP_SMUDGE': '1'}
    command(['git', '-c', 'core.hooksPath=/dev/null', 'clone', '--no-checkout',
             '--template=', f'https://github.com/{REPOSITORY}.git', str(project)],
            env=environment, timeout=300)
    command(['git', 'merge-base', '--is-ancestor', sha, 'origin/main'], cwd=project, env=environment)
    tree = command(['git', 'ls-tree', '-r', sha], cwd=project, env=environment).decode()
    if any(line.startswith(('120000', '160000')) for line in tree.splitlines()):
        raise BoundaryError('Source symlinks or submodules are unsupported')
    command(['git', '-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', sha],
            cwd=project, env=environment)
    # Remove private historical configuration only from the disposable scan checkout.
    for path in project.rglob('.env*'):
        if path.is_file() and path.name != '.env.example':
            path.unlink()
    for path in project.rglob('*'):
        if path.is_file():
            path.chmod(path.stat().st_mode | 0o044)
        elif path.is_dir():
            path.chmod(path.stat().st_mode | 0o055)


def download_coverage(run, token, destination):
    artifacts = api(f'repos/{REPOSITORY}/actions/runs/{run["id"]}/artifacts?per_page=100', token)
    expected_name = f'happihub-coverage-{run.get("run_attempt", 1)}'
    candidates = [item for item in artifacts['artifacts'] if item['name'] == expected_name]
    if len(candidates) != 1:
        raise BoundaryError('Expected exactly one coverage artifact for this attempt')
    artifact = candidates[0]
    metadata = artifact.get('workflow_run', {})
    if (artifact.get('expired') or artifact['size_in_bytes'] > MAX_ARCHIVE
            or metadata.get('head_sha') != run['head_sha']
            or metadata.get('repository_id') != REPOSITORY_ID
            or metadata.get('head_repository_id') != REPOSITORY_ID
            or metadata.get('id') != run['id']):
        raise BoundaryError('Artifact provenance or retention check failed')
    archive = destination / 'coverage.zip'
    arguments = ['gh', 'api', '--hostname', 'github.com',
                 f'repos/{REPOSITORY}/actions/artifacts/{artifact["id"]}/zip']
    with archive.open('wb') as stream:
        process = subprocess.Popen(arguments, env=github_env(token), stdout=stream,
                                   stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
        deadline = time.monotonic() + 120
        try:
            while process.poll() is None:
                if time.monotonic() >= deadline or archive.stat().st_size > MAX_ARCHIVE:
                    raise BoundaryError('Coverage download exceeded time or size limit')
                time.sleep(0.1)
            if process.returncode:
                raise BoundaryError('Coverage download failed')
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
    if archive.stat().st_size > MAX_ARCHIVE:
        raise BoundaryError('Coverage download exceeds limit')
    return archive.read_bytes(), artifact.get('digest')


def scan(project, name, sha, token, log_path):
    verify_network()
    environment = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'SONAR_TOKEN': token}
    # Suppress raw scanner output; it is retained privately for controlled diagnostics.
    with log_path.open('wb') as output:
        try:
            subprocess.run(scanner_args(project, name, sha), env=environment,
                           stdout=output, stderr=subprocess.STDOUT, timeout=900,
                           stdin=subprocess.DEVNULL, check=False)
        except subprocess.TimeoutExpired:
            command(['docker', 'stop', '--time', '5', name])
    # Reconcile the computed gate even when the scanner exited nonzero for a red gate.
    try:
        task_id = container_task(name, log_path.parent, project.parent / 'analysis-state')
        outcome = task_result(task_id, token)
        return outcome or {'state': 'error', 'description': 'Analysis still computing; operator reconciliation required',
                           'task_id': task_id}
    except BoundaryError:
        return {'state': 'error', 'description': 'Scanner failed before a definitive analysis result'}
    finally:
        # Redact the private diagnostic file too, rather than relying on file permissions.
        with log_path.open('rb') as diagnostic:
            bounded_log = diagnostic.read(2 * 1024 * 1024)
        bounded_log = re.sub(rb'sqp_[A-Za-z0-9]+', b'[REDACTED]', bounded_log)
        log_path.write_bytes(bounded_log.replace(token.encode(), b'[REDACTED]'))
        retire_container(name)


def reconcile_container(name, directory, token, analysis_directory=None):
    """After interruption never automatically resubmit an uncertain scanner write."""
    try:
        try:
            task = container_task(name, directory, analysis_directory)
        finally:
            retire_container(name)
        outcome = task_result(task, token)
        if outcome is not None:
            return outcome
    except BoundaryError:
        return {'state': 'error', 'description': 'Interrupted scan requires reconciliation before rerun'}
    return {'state': 'error', 'description': 'Interrupted scan requires reconciliation before rerun'}


def collect(config, github_token, sonar_token):
    if type(config.get('workflow_id')) is not int or config['workflow_id'] < 1:
        raise BoundaryError('Workflow has not been registered in main; collector remains inactive')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', config.get('activation', '')):
        raise BoundaryError('Activation must be an explicit UTC checkpoint')
    state_dir = Path(config['state_directory']).resolve()
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    state_dir.chmod(0o700)
    with (state_dir / 'lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        state_path = state_dir / 'state.json'
        state = json.loads(state_path.read_text()) if state_path.exists() else {'version': 1, 'runs': {}}
        if state.get('version') != 1:
            raise BoundaryError('Unsupported collector state version')
        identity = api(f'repos/{REPOSITORY}', github_token)
        workflow = api(f'repos/{REPOSITORY}/actions/workflows/quality-tests.yml', github_token)
        if identity['id'] != REPOSITORY_ID or workflow['id'] != config['workflow_id'] or workflow['path'] != WORKFLOW:
            raise BoundaryError('Configured repository or workflow identity changed')
        discovered = []
        for page in range(1, 101):
            data = api(f'repos/{REPOSITORY}/actions/workflows/{config["workflow_id"]}/runs'
                       f'?event=push&branch=main&per_page=100&page={page}', github_token)
            runs = data['workflow_runs']
            discovered.extend(runs)
            if not runs or min(item['created_at'] for item in runs) < config['activation']:
                break
        else:
            raise BoundaryError('Run pagination limit reached; checkpoint needs operator review')
        for run in sorted(discovered, key=lambda item: (item['created_at'], item['id'])):
            if not trusted_run(run, config['workflow_id'], config['activation']):
                continue
            # An earlier unfinished push must not be overtaken by a later scan.
            if run['status'] != 'completed':
                break
            key = run_key(run)
            entry = state['runs'].setdefault(key, {'phase': 'new'})
            if entry['phase'] == 'done':
                continue
            if entry['phase'] == 'scanning':
                entry['result'] = reconcile_container(entry['container'], state_dir, sonar_token,
                                                      entry.get('analysis_directory'))
                entry['phase'] = 'result'
                save_state(state_path, state)
            if entry['phase'] == 'new':
                if not eligible_run(run, config['workflow_id'], config['activation']):
                    entry['result'] = {'state': 'failure', 'description': 'Hosted tests failed; Sonar scan not submitted'}
                    entry['phase'] = 'result'
                elif tuple(state.get('last_order', ['', 0])) > (run['created_at'], run['id']):
                    entry['result'] = {'state': 'error', 'description': 'Late older run requires ordered baseline reconciliation'}
                    entry['phase'] = 'result'
                else:
                    publish_status(run, 'pending', 'Local SonarQube scan queued', github_token)
                    execute_run(run, entry, state, state_path, state_dir, config, github_token, sonar_token)
            if entry['phase'] == 'result':
                publish_status(run, entry['result']['state'], entry['result']['description'], github_token)
                entry['phase'] = 'done'
                save_state(state_path, state)
                # One completed queue item per invocation bounds the service workload.
                return


def execute_run(run, entry, state, state_path, state_dir, config, github_token, sonar_token):
    """Persist uncertain submission before invoking the scanner; never blind-retry it."""
    try:
        with tempfile.TemporaryDirectory(prefix='scan-', dir=state_dir) as temporary:
            os.chmod(temporary, 0o755)
            folder = Path(temporary)
            project = folder / 'source'
            export_source(project, run['head_sha'])
            data, digest = download_coverage(run, github_token, folder)
            unpack_coverage(data, project, run, digest)
            for report in REPORTS:
                normalize_lcov(project / report, project)
            shutil.copyfile(config['properties_file'], project / 'sonar-project.properties')
            for path in project.rglob('*'):
                if path.is_dir():
                    path.chmod(0o755)
                elif path.is_file():
                    path.chmod(0o644)
            entry['container'] = 'happihub-scan-' + uuid.uuid4().hex
            analysis = folder / 'analysis-state'
            analysis.mkdir(mode=0o700)
            entry['analysis_directory'] = str(analysis)
            entry['phase'] = 'scanning'
            save_state(state_path, state)
            result = scan(project, entry['container'], run['head_sha'], sonar_token,
                          state_dir / (entry['container'] + '.log'))
            entry['result'] = result
            entry['phase'] = 'result'
            state['last_order'] = [run['created_at'], run['id']]
            save_state(state_path, state)
    except BoundaryError as error:
        entry['result'] = {'state': 'error', 'description': str(error)}
        entry['phase'] = 'result'
        save_state(state_path, state)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    try:
        config = json.loads(args.config.read_text())
        collect(config, read_credential('github-token', config), read_credential('sonar-token', config))
    except (BoundaryError, KeyError, ValueError, OSError) as error:
        # Do not echo arbitrary GitHub/process/credential content.
        print(f'Collector stopped: {type(error).__name__}; inspect approved configuration and private state')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
