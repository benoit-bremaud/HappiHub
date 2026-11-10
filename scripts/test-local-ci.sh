#!/bin/sh
# Tests for the local CI wiring (#410, skill local-ci rule 7): the tiers compose (check ⊇ lint + test +
# security + secrets; gate and nightly ⊇ check, and both run the integration suite), gate captures the
# head SHA before its first check, refuses a dirty tree and ends with the attestation on that SHA,
# merge verifies it (agents-skills ADR-0003), no GitHub workflow exists (ADR-0005), mise.toml pins the
# .nvmrc Node, lefthook.yml is valid and wires the commit-msg and pre-push hooks, the commit-msg check
# accepts and refuses the right subjects (100-character limit included), and in a throwaway repository
# L0 (`just fast`) passes a clean staged change and an empty stage but refuses a staged secret and a
# staged typo, and the installed commit-msg hook refuses a bad subject. Needs mise, just, lefthook,
# gitleaks, typos on PATH:
#   mise x -- sh scripts/test-local-ci.sh
set -e
# A hook (pre-push runs `just check`) exports these; they would aim git at the outer repository.
# shellcheck disable=SC2046 # one variable name per word
unset $(git rev-parse --local-env-vars)
# The developer's git config (signing, hooksPath) and mise trust list stay out of the throwaway repo.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
n=0
fail() { echo "FAIL $1"; exit 1; }
ok() { n=$((n + 1)); } # one counted case

# `mise x --` puts the tools on PATH but not mise itself (hooks and the throwaway repo need it).
command -v mise > /dev/null || { [ -x "$HOME/.local/bin/mise" ] && PATH="$HOME/.local/bin:$PATH" && export PATH; }
for bin in mise just lefthook gitleaks typos; do
  command -v "$bin" > /dev/null || fail "$bin not on PATH"
done

# Tiers and their composition (a missing recipe fails `just --show`).
cd "$root"
deps() { just --show "$1" | grep -E "^$1( |:)" | sed 's/.*: *//'; } # deps <recipe>
for d in lint test security secrets; do deps check | grep -qw "$d" || fail "check lacks $d"; ok; done
deps nightly | grep -qw check || fail "nightly does not depend on check"; ok
deps nightly | grep -qw integration || fail "nightly does not run the integration suite"; ok
body() { just --show "$1" | grep -v '^ *#'; } # body <recipe>: its lines, comments dropped
body gate | grep -q '^ *just check$' || fail "gate does not run check"; ok
body gate | grep -q '^ *just integration$' || fail "gate does not run the integration suite"; ok
body gate | grep -q 'sonar-scanner -Dsonar.qualitygate.wait=true' || fail "gate does not wait for the SonarQube quality gate"; ok
body gate | grep -q '^ *cd e2e && npm test' || fail "gate does not run the smoke and E2E suites"; ok
body gate | grep -q '^ *sh scripts/attest.sh write gate "\$head"$' || fail "gate does not attest the captured head"; ok
dirty=$(body gate | grep -n 'git status --porcelain' | head -1 | cut -d: -f1); hd=$(body gate | grep -n '^ *head=$(git rev-parse HEAD)$' | cut -d: -f1); ck=$(body gate | grep -n '^ *just check$' | cut -d: -f1)
[ -n "$dirty" ] && [ -n "$hd" ] && [ -n "$ck" ] && [ "$dirty" -lt "$hd" ] && [ "$hd" -lt "$ck" ] \
  || fail "gate must refuse a dirty tree, then capture HEAD, before its first check"; ok
body merge | grep -q '^ *sh scripts/attest.sh verify gate "\$sha"$' || fail "merge does not verify the attestation"; ok
body merge | grep -q -- '--match-head-commit "\$sha"' || fail "merge does not pin the head SHA"; ok
body test | grep -q 'jest --config jest.config.cjs --runInBand --coverage' || fail "test does not run the server unit suite with coverage"; ok
body test | grep -q -- "--collectCoverageFrom='src/\*\*/\*.{js,jsx}'" || fail "test lost the client coverage globs"; ok
body test | grep -q '^ *sh scripts/test-attest.sh$' || fail "test does not run the attestation tests"; ok
body integration | grep -q 'npm run test:integration' || fail "integration does not run the server integration suite"; ok

# No GitHub workflow (ADR-0005: nothing deploys from GitHub).
[ ! -e .github/workflows ] || fail ".github/workflows exists (ADR-0005: zero workflow)"; ok
grep -q "^node = \"$(cat .nvmrc)\"" mise.toml || fail "mise.toml node differs from .nvmrc"; ok
grep -q '^lockfile = true' mise.toml && [ -s mise.lock ] || fail "mise.lock missing or lockfile not enabled"; ok

# Hooks.
grep -qE '^ +run: +sh scripts/check-commit-msg.sh \{1\}$' lefthook.yml || fail "commit-msg hook does not run check-commit-msg.sh on the message file"; ok
grep -qE '^ +mise x -- just check$' lefthook.yml || fail "pre-push hook does not run just check"; ok
lefthook validate > /dev/null || fail "lefthook validate"; ok

# commit-msg subjects.
msg() { # msg <expected-exit> <subject>
  printf '%s\n' "$2" > "$work/msg"
  rc=0; sh scripts/check-commit-msg.sh "$work/msg" > /dev/null 2>&1 || rc=$?
  [ "$rc" -eq "$1" ] || fail "commit-msg '$2': exit $rc, expected $1"; ok
}
msg 0 'ci(workflows): wire just + lefthook + mise'
msg 0 'feat!: drop the legacy endpoint'
msg 0 'feat(api)!: drop the v1 endpoint'
msg 0 'Merge branch main into feat/1'
msg 1 'Wire just'
msg 1 'ci(workflows): ends with a period.'
msg 1 'wip: not a listed type'
msg 1 'Feat: capitalised type'
msg 1 'feat:no space after the colon'
msg 1 ''
long=$(printf 'x%.0s' $(seq 1 94))
msg 0 "feat: $long"   # 100 characters
msg 1 "feat: ${long}x" # 101
rc=0; sh scripts/check-commit-msg.sh > /dev/null 2>&1 || rc=$?; [ "$rc" -eq 2 ] || fail "check-commit-msg without argument: exit $rc, expected 2"; ok

# L0 in a throwaway repository holding this repository's hook config and scripts.
repo="$work/repo"
mkdir -p "$repo" && cd "$repo"
git init -q -b main && git config user.email t@example.com && git config user.name t
cp -R "$root/scripts" "$root/lefthook.yml" "$root/justfile" "$root/typos.toml" "$root/mise.toml" "$root/mise.lock" "$root/.nvmrc" .
export MISE_TRUSTED_CONFIG_PATHS="$repo"
git add -A && git commit -qm init --no-verify
mkdir notes

fast() { # fast <expected-exit> <label> [<text the output must hold>]
  rc=0; just fast > "$work/out" 2>&1 || rc=$?
  [ "$rc" -eq "$1" ] || { cat "$work/out"; fail "$2: exit $rc, expected $1"; }
  [ -z "${3:-}" ] || grep -qF "$3" "$work/out" || { cat "$work/out"; fail "$2: output lacks '$3'"; }
  ok
}

fast 0 "empty stage"

echo 'Plain notes.' > notes/a.txt && git add notes/a.txt
fast 0 "clean staged change"

key="AKIA$(printf seed | sha256sum | cut -c1-16 | tr 'a-f0-9' 'A-FG-P')"
printf 'token %s\n' "$key" > notes/leak.txt && git add notes/leak.txt
fast 1 "staged secret refused" "leaks found"
git rm -q --cached notes/leak.txt

printf 't%sh notes\n' e > notes/b.txt && git add notes/b.txt
fast 1 "staged typo refused" "should be"
git rm -q --cached notes/b.txt

# The installed commit-msg hook, end to end (pre-commit runs too: the stage is clean).
mise x -- lefthook install > /dev/null 2>&1 || fail "lefthook install in the throwaway repo"
git commit -qm 'Wire just' > /dev/null 2>&1 && fail "commit-msg hook accepted a bad subject"; ok
git commit -qm 'test(notes): add a plain note' > /dev/null 2>&1 || fail "commit-msg hook refused a good subject"; ok

echo "test-local-ci: $n cases passed"
