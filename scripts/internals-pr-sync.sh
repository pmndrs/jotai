#!/usr/bin/env bash
# Push sibling internals branches to your fork and create/update PRs on pmndrs/jotai.
#
# Authentication (pick one):
#   • Export JOTAI_PR_SYNC_TOKEN, GH_TOKEN, or GITHUB_TOKEN (classic PAT: repo scope, or
#     fine-grained: read/write on your fork + ability to open PRs into pmndrs/jotai).
#   • Or: gh auth login -h github.com  (then git push must still work for origin — SSH or helper).
#
# gh binary: prefer ./.tools/gh-official/gh (official build) over a corporate wrapper on PATH.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GH="${GH:-}"
if [[ -z "$GH" ]]; then
  if [[ -x "$ROOT/.tools/gh-official/gh" ]]; then
    GH="$ROOT/.tools/gh-official/gh"
  elif command -v gh >/dev/null 2>&1; then
    GH="$(command -v gh)"
  else
    echo "No gh found. Install: https://cli.github.com/ (or unzip under .tools/gh-official/ — see script header in git history)." >&2
    exit 1
  fi
fi

export GH_HOST="${GH_HOST:-github.com}"

PAT="${JOTAI_PR_SYNC_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
if [[ -n "$PAT" ]]; then
  export GH_TOKEN="$PAT"
fi

# Parse github.com:owner/repo or https://github.com/owner/repo.git from origin
parse_origin() {
  local u
  u="$(git remote get-url origin)"
  if [[ "$u" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    PARSED_OWNER="${BASH_REMATCH[1]}"
    PARSED_REPO="${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}
if ! parse_origin; then
  echo "Could not parse owner/repo from: git remote get-url origin" >&2
  exit 1
fi

FORK_OWNER="${FORK_OWNER:-$PARSED_OWNER}"
FORK_REPO="${FORK_REPO:-$PARSED_REPO}"
AUTH_PUSH_URL="https://oauth2:${PAT}@github.com/${FORK_OWNER}/${FORK_REPO}.git"

DOCS="$ROOT/.github/pr-descriptions-internals-split.md"
if [[ ! -f "$DOCS" ]]; then
  echo "Missing $DOCS" >&2
  exit 1
fi

BODY1="$(mktemp)"
BODY2="$(mktemp)"
trap 'rm -f "$BODY1" "$BODY2"' EXIT

awk '/^## PR 1/ {p=1; next} /^## PR 2/ {p=0; next} p' "$DOCS" >"$BODY1"
awk '/^## PR 2/ {p=1; next} /^## Local branch tips/ {p=0; next} p' "$DOCS" >"$BODY2"

UPSTREAM_REPO="${UPSTREAM_REPO:-pmndrs/jotai}"
BASE_BRANCH="${BASE_BRANCH:-breaking/building-blocks-in-params}"

if [[ "${SKIP_PUSH:-}" == "1" ]]; then
  echo "==> Skipping git push (SKIP_PUSH=1)"
else
  echo "==> Pushing branches to ${FORK_OWNER}/${FORK_REPO}"
  if [[ -n "$PAT" ]]; then
    git push "$AUTH_PUSH_URL" \
      "refs/heads/internals/bb-rev3-type-guards:refs/heads/internals/bb-rev3-type-guards" \
      "refs/heads/internals/bb-rev3-on-init:refs/heads/internals/bb-rev3-on-init" \
      --force-with-lease
  else
    if ! git push origin internals/bb-rev3-type-guards internals/bb-rev3-on-init --force-with-lease; then
      echo >&2
      echo "git push failed. This environment has no GitHub credentials." >&2
      echo "Set JOTAI_PR_SYNC_TOKEN (or GH_TOKEN) to a PAT with repo scope, then re-run:" >&2
      echo "  JOTAI_PR_SYNC_TOKEN=ghp_… bash scripts/internals-pr-sync.sh" >&2
      exit 1
    fi
  fi
fi

if [[ -z "$PAT" ]] && ! "$GH" auth status -h github.com 2>/dev/null; then
  echo "gh is not logged in and no GH_TOKEN / JOTAI_PR_SYNC_TOKEN is set." >&2
  echo "Run: gh auth login -h github.com   OR export JOTAI_PR_SYNC_TOKEN=…" >&2
  exit 1
fi
if [[ -n "$PAT" ]] && ! "$GH" api user -q .login >/dev/null 2>&1; then
  echo "GH_TOKEN / JOTAI_PR_SYNC_TOKEN is set but GitHub API rejected it (expired or missing repo scope?)." >&2
  exit 1
fi

ensure_pr() {
  local branch="$1" title="$2" bodyfile="$3"
  local head="${FORK_OWNER}:${branch}"
  local num
  num="$("$GH" pr list --repo "$UPSTREAM_REPO" --head "$head" --json number --jq '.[0].number // empty')"
  if [[ -n "$num" ]]; then
    echo "==> Updating PR #$num ($branch)"
    "$GH" pr edit "$num" --repo "$UPSTREAM_REPO" --title "$title" --body-file "$bodyfile"
  else
    echo "==> Creating PR for $head -> $UPSTREAM_REPO (base $BASE_BRANCH)"
    "$GH" pr create --repo "$UPSTREAM_REPO" --base "$BASE_BRANCH" --head "$head" \
      --title "$title" --body-file "$bodyfile"
  fi
}

echo "==> Create or update PRs on $UPSTREAM_REPO"
ensure_pr internals/bb-rev3-type-guards \
  'refactor(internals): Rev3 type narrowing for onMount hooks' \
  "$BODY1"
ensure_pr internals/bb-rev3-on-init \
  'fix(internals): guard atomOnInit hook with hasOnInit' \
  "$BODY2"

n1="$("$GH" pr list --repo "$UPSTREAM_REPO" --head "$FORK_OWNER:internals/bb-rev3-type-guards" --json number --jq '.[0].number // empty')"
n2="$("$GH" pr list --repo "$UPSTREAM_REPO" --head "$FORK_OWNER:internals/bb-rev3-on-init" --json number --jq '.[0].number // empty')"
echo "Done. PRs: https://github.com/$UPSTREAM_REPO/pull/$n1 https://github.com/$UPSTREAM_REPO/pull/$n2"
