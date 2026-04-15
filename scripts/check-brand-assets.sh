#!/usr/bin/env bash
set -euo pipefail

BRAND_DIR="public/brand/"
ALLOWLIST_FILE=".logo-change-allowlist"
LOGO_TAG="[logo-change]"

BASE_REF="${BRAND_GUARD_BASE:-${GITHUB_BASE_REF:-}}"
HEAD_REF="${BRAND_GUARD_HEAD:-${GITHUB_SHA:-HEAD}}"

if [[ -n "$BASE_REF" ]] && git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  DIFF_RANGE="$BASE_REF...$HEAD_REF"
  CHANGED_FILES="$(git diff --name-only "$DIFF_RANGE")"
else
  CHANGED_FILES="$(git diff-tree --no-commit-id --name-only -r HEAD)"
fi

if [[ -z "$CHANGED_FILES" ]]; then
  echo "No changed files detected; skipping logo guard."
  exit 0
fi

if ! echo "$CHANGED_FILES" | rg -q "^${BRAND_DIR}"; then
  echo "No changes under ${BRAND_DIR}; logo guard passed."
  exit 0
fi

if echo "$CHANGED_FILES" | rg -q "^${ALLOWLIST_FILE}$"; then
  echo "Logo changes allowed: ${ALLOWLIST_FILE} was modified in this change set."
  exit 0
fi

COMMIT_MSG="$(git log -1 --pretty=%B)"
if [[ "$COMMIT_MSG" == *"$LOGO_TAG"* ]]; then
  echo "Logo changes allowed: commit message contains ${LOGO_TAG}."
  exit 0
fi

echo "Logo asset change detected under ${BRAND_DIR}."
echo "To proceed intentionally, either:"
echo "  1) include ${LOGO_TAG} in the commit message, or"
echo "  2) modify ${ALLOWLIST_FILE} in the same change set."
exit 1
