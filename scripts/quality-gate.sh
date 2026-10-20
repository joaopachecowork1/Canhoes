#!/bin/sh
# The checks every change passes before it leaves the machine: format, lint, types, unit and component tests,
# dead code. The git pre-push hook and the Claude Code hooks run this script; CI runs the same checks
# plus the integration tests and coverage. Prints only the failing step's output.
#
#   scripts/quality-gate.sh          run every check
#   scripts/quality-gate.sh --cached skip when nothing changed since the last run that passed
set -u

cd "$(dirname "$0")/.." || exit 1

stamp_file=".git/quality-gate.pass"
# Tracked changes plus the content of untracked files: a new edit changes it, a re-run does not.
tree_state=$({ git diff HEAD; git ls-files --others --exclude-standard | xargs -r sha1sum; } | sha1sum | cut -d' ' -f1)

if [ "${1:-}" = "--cached" ] && [ -f "$stamp_file" ] && [ "$(cat "$stamp_file")" = "$tree_state" ]; then
  exit 0
fi

run_step() {
  name=$1
  shift
  if ! output=$("$@" 2>&1); then
    printf 'Quality gate failed at "%s":\n\n%s\n' "$name" "$(printf '%s\n' "$output" | tail -n 60)" >&2
    exit 1
  fi
}

run_step "format" npm run format:check --silent
run_step "lint" npm run lint --silent
run_step "types" npx tsc --noEmit
run_step "unit tests" npm test --silent
run_step "component tests" npm run test:component --silent
run_step "knip" npm run knip --silent

printf '%s\n' "$tree_state" > "$stamp_file"
