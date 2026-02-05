#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: auto-develop.sh --research <claude|codex> --implement <claude|codex> --review-a <claude|codex> --review-b <claude|codex>
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

validate_agent() {
  local agent="$1"
  case "$agent" in
    claude|codex) ;;
    *) die "Invalid agent: $agent (expected 'claude' or 'codex')" ;;
  esac
}

run_agent() {
  local agent="$1"
  local prompt="$2"
  if [[ "$agent" == "claude" ]]; then
    claude --dangerously-skip-permissions -p "$prompt"
  else
    codex exec --yolo "$prompt"
  fi
}

first_word() {
  local file="$1"
  [[ -s "$file" ]] || die "Expected non-empty file: $file"
  awk 'NR==1{print $1; exit}' "$file"
}

RESEARCH_AGENT=""
IMPLEMENT_AGENT=""
REVIEW_A_AGENT=""
REVIEW_B_AGENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --research) RESEARCH_AGENT="${2:-}"; shift 2 ;;
    --implement) IMPLEMENT_AGENT="${2:-}"; shift 2 ;;
    --review-a) REVIEW_A_AGENT="${2:-}"; shift 2 ;;
    --review-b) REVIEW_B_AGENT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$RESEARCH_AGENT" && -n "$IMPLEMENT_AGENT" && -n "$REVIEW_A_AGENT" && -n "$REVIEW_B_AGENT" ]] || {
  usage
  exit 1
}

validate_agent "$RESEARCH_AGENT"
validate_agent "$IMPLEMENT_AGENT"
validate_agent "$REVIEW_A_AGENT"
validate_agent "$REVIEW_B_AGENT"

require_cmd git
require_cmd gh
require_cmd jq

needs_claude=false
needs_codex=false
for agent in "$RESEARCH_AGENT" "$IMPLEMENT_AGENT" "$REVIEW_A_AGENT" "$REVIEW_B_AGENT"; do
  case "$agent" in
    claude) needs_claude=true ;;
    codex) needs_codex=true ;;
  esac
done

if $needs_claude; then
  require_cmd claude
fi
if $needs_codex; then
  require_cmd codex
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repository."
cd "$repo_root"

gh auth status -t >/dev/null 2>&1 || die "gh is not authenticated. Run 'gh auth login'."

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$current_branch" != "HEAD" ]] || die "Detached HEAD. Checkout a branch before running."
target_branch="$current_branch"

[[ -z "$(git status --porcelain)" ]] || die "Working tree is not clean. Commit or stash before running."

name_with_owner="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
owner="${name_with_owner%%/*}"
repo="${name_with_owner#*/}"
required_owner="TheMorpheus407"
[[ "$owner" == "$required_owner" ]] || die "Repository owner must be $required_owner (found: $owner)."

gql='
query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    issues(states: OPEN, first: 100, after: $endCursor, filterBy: {createdBy: $owner}) {
      nodes { number }
      pageInfo { hasNextPage endCursor }
    }
  }
}
'

issue_number="$(
  gh api graphql --paginate --slurp -F owner="$owner" -F name="$repo" -f query="$gql" \
    | jq '[.[].data.repository.issues.nodes[].number] | min'
)"

[[ -n "$issue_number" && "$issue_number" != "null" ]] || die "No open issues found."

issue_dir="logs/issues/$issue_number"
mkdir -p "$issue_dir"

issue_title="$(gh issue view "$issue_number" --json title -q .title)"
issue_json="$issue_dir/issue.json"
gh issue view "$issue_number" --json number,title,body,author,labels,assignees,comments,createdAt,updatedAt,url --comments > "$issue_json"

research_file="$issue_dir/research.md"
implementation_file="$issue_dir/implementation.md"
review_a_file="$issue_dir/review-1.md"
review_b_file="$issue_dir/review-2.md"

rm -f "$research_file"

research_prompt=$(cat <<EOF
You are the Research Agent for GitHub issue #$issue_number in this repository.

Requirements:
- Read the issue and all comments using the GitHub CLI (gh).
- Read relevant code and documentation in the repository.
- Provide deep research: current behavior, root cause analysis, impacted modules, constraints, alternative approaches, risks, and test ideas.
- Write your research to: $research_file (Markdown).
- Post your research as a comment on issue #$issue_number via gh.

Important:
- Write the full research to the file.
- Mention key findings in the file.
EOF
)

run_agent "$RESEARCH_AGENT" "$research_prompt"
[[ -s "$research_file" ]] || die "Research file missing or empty: $research_file"

while true; do
  rm -f "$implementation_file" "$review_a_file" "$review_b_file"

  implement_prompt=$(cat <<EOF
You are the Implementer Agent for GitHub issue #$issue_number in this repository.

Requirements:
- Read the issue and all comments using the GitHub CLI (gh).
- Read ALL documents in: $issue_dir
- Implement the issue and add/update tests.
- Run tests if available;
- Write a summary to: $implementation_file (Markdown). Include changes made, files touched, and tests run.

Important:
- Do NOT commit changes.
- Write the documentation file directly.
EOF
)

  run_agent "$IMPLEMENT_AGENT" "$implement_prompt"
  [[ -s "$implementation_file" ]] || die "Implementation file missing or empty: $implementation_file"

  review_a_prompt=$(cat <<EOF
You are Reviewer A for GitHub issue #$issue_number. Focus: correctness of the uncommitted changes.

Requirements:
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Check clean code, regressions, bugs, correctness, edge cases, complexity and maintainability, naming conventions, DRY, documentation within the code, test quality and coverage, separation of concerns, scalability, security, vulnerabilities, efficiency, UX-
- Run tests if available; if none are found, say so explicitly.
- First word MUST be ACCEPTED or DENIED followed by ONE space!
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_a_file

Important:
- Do NOT pipe output to a file. Write the file directly.
EOF
)

  run_agent "$REVIEW_A_AGENT" "$review_a_prompt"
  [[ -s "$review_a_file" ]] || die "Review A file missing or empty: $review_a_file"

  review_b_prompt=$(cat <<EOF
You are Reviewer B for GitHub issue #$issue_number. Focus: do the uncommitted changes solve the issue?

Requirements:
- Read the issue and comments, then evaluate the changes against the requirements. The goal is to PROOF, that the changes solve the given issue completely.
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Run tests if available; if none are found, say so explicitly.
- First word MUST be ACCEPTED or DENIED.
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_b_file

Important:
- Write findings to the review document directly.
EOF
)

  run_agent "$REVIEW_B_AGENT" "$review_b_prompt"
  [[ -s "$review_b_file" ]] || die "Review B file missing or empty: $review_b_file"

  review_a_word="$(first_word "$review_a_file")"
  review_b_word="$(first_word "$review_b_file")"

  if [[ "$review_a_word" == "ACCEPTED" && "$review_b_word" == "ACCEPTED" ]]; then
    break
  fi

  echo "Reviews not accepted. Restarting implementation loop."
done

git add -A

if git diff --cached --quiet; then
  die "No changes staged for commit."
fi

commit_title="$(printf "%s" "$issue_title" | tr '\n' ' ' | tr -s ' ')"
git commit -m "Issue #$issue_number: $commit_title"
git push origin "$target_branch"
gh issue close "$issue_number"

echo "Completed issue #$issue_number."
