#!/usr/bin/env bash
set -uo pipefail

usage() {
  cat <<'EOF'
Usage: auto-develop.sh --research <claude|codex|opencode> --implement <claude|codex|opencode> --review-a <claude|codex|opencode> --review-b <claude|codex|opencode> [--finalize <claude|codex|opencode>]

Options:
  --research <agent>     Research agent runner
  --implement <agent>    Implementer agent runner
  --review-a <agent>     Reviewer A agent runner
  --review-b <agent>     Reviewer B agent runner
  --finalize <agent>     Finalizer agent runner (defaults to --implement)
  --max-issues <n>       Stop after completing n issues
  --issue <number>       Process only this open issue number
  -h, --help             Show this help text

Examples:
  ./auto-develop.sh --research opencode --implement opencode --review-a opencode --review-b opencode --finalize opencode --max-issues 1
  ./auto-develop.sh --research opencode --implement opencode --review-a opencode --review-b opencode --finalize opencode --issue 42
  ./auto-develop.sh --research codex --implement codex --review-a codex --review-b codex --max-issues 1
  ./auto-develop.sh --research claude --implement claude --review-a claude --review-b claude --max-issues 1
  ./auto-develop.sh --research claude --implement claude --review-a claude --review-b claude --issue 42
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARN: $*" >&2
}

sleep_briefly() {
  sleep 2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

validate_positive_integer() {
  local value="$1"
  local name="$2"
  [[ "$value" =~ ^[1-9][0-9]*$ ]] || die "$name must be a positive integer (received: $value)"
}

validate_agent() {
  local agent="$1"
  case "$agent" in
    claude|codex|opencode) ;;
    *) die "Invalid agent: $agent (expected 'claude', 'codex', or 'opencode')" ;;
  esac
}

run_agent() {
  local agent="$1"
  local prompt="$2"
  if [[ "$agent" == "claude" ]]; then
    claude --dangerously-skip-permissions -p "$prompt"
  elif [[ "$agent" == "codex" ]]; then
    codex exec --yolo "$prompt"
  else
    opencode run "$prompt"
  fi
}

first_word() {
  local file="$1"
  [[ -s "$file" ]] || { echo ""; return 0; }
  awk 'NR==1{print $1; exit}' "$file"
}

is_head_pushed() {
  local branch="$1"
  local local_head remote_head

  local_head="$(git rev-parse HEAD 2>/dev/null)" || return 1
  remote_head="$(git ls-remote --heads origin "$branch" 2>/dev/null | awk 'NR==1{print $1}')"

  [[ -n "$remote_head" && "$local_head" == "$remote_head" ]]
}

is_issue_closed() {
  local issue_num="$1"
  local state

  state="$(gh issue view "$issue_num" --json state -q .state 2>/dev/null || true)"
  [[ "$state" == "CLOSED" ]]
}

# Derive conventional commit type from issue labels.
# Reads labels from the issue JSON file (gh issue view --json output).
# Returns one of: fix, feat, docs, test, ci, chore (default: feat).
derive_commit_type() {
  local issue_json_file="$1"
  local labels
  labels="$(jq -r '[.labels[].name] | map(ascii_downcase) | .[]' "$issue_json_file" 2>/dev/null)"
  [[ -n "$labels" ]] || { echo "feat"; return 0; }

  # Check labels in priority order (most specific first)
  if echo "$labels" | grep -qx "bug"; then
    echo "fix"
  elif echo "$labels" | grep -qx "testing"; then
    echo "test"
  elif echo "$labels" | grep -qx "documentation"; then
    echo "docs"
  elif echo "$labels" | grep -qxE "infrastructure|ci"; then
    echo "ci"
  elif echo "$labels" | grep -qx "devtools"; then
    echo "chore"
  elif echo "$labels" | grep -qxE "enhancement|feature"; then
    echo "feat"
  else
    echo "feat"
  fi
}

# Derive conventional commit scope from issue labels.
# Maps labels to the allowed scope-enum in .commitlintrc.json:
#   web, api, shared, infra, ci, db, e2e, docker, auth, docs, config, deps
# Returns empty string if no scope can be determined.
derive_commit_scope() {
  local issue_json_file="$1"
  local labels
  labels="$(jq -r '[.labels[].name] | map(ascii_downcase) | .[]' "$issue_json_file" 2>/dev/null)"
  [[ -n "$labels" ]] || { echo ""; return 0; }

  if echo "$labels" | grep -qx "frontend"; then
    echo "web"
  elif echo "$labels" | grep -qx "backend"; then
    echo "api"
  elif echo "$labels" | grep -qx "shared"; then
    echo "shared"
  elif echo "$labels" | grep -qx "infrastructure"; then
    echo "infra"
  elif echo "$labels" | grep -qx "ci"; then
    echo "ci"
  elif echo "$labels" | grep -qx "database"; then
    echo "db"
  elif echo "$labels" | grep -qx "testing"; then
    echo "e2e"
  elif echo "$labels" | grep -qx "documentation"; then
    echo "docs"
  elif echo "$labels" | grep -qx "devtools"; then
    echo "config"
  else
    echo ""
  fi
}

# Build the conventional commit message for an issue.
# Format: type(scope): description\n\nCloses #N
# Usage: build_commit_message <issue_json_file> <issue_number> <issue_title>
build_commit_message() {
  local issue_json_file="$1"
  local issue_num="$2"
  local raw_title="$3"

  local commit_type
  commit_type="$(derive_commit_type "$issue_json_file")"

  local commit_scope
  commit_scope="$(derive_commit_scope "$issue_json_file")"

  # Strip milestone prefix patterns like "M0-13:" or "M0:" from the title
  local description
  description="$(printf "%s" "$raw_title" | sed -E 's/^M[0-9]+-?[0-9]*:[[:space:]]*//')"

  # Collapse whitespace and newlines
  description="$(printf "%s" "$description" | tr '\n' ' ' | tr -s ' ')"

  # Trim leading/trailing whitespace
  description="$(printf "%s" "$description" | sed -E 's/^[[:space:]]+//;s/[[:space:]]+$//')"

  # Lowercase entire description (commitlint subject-case: lower-case)
  description="$(printf "%s" "$description" | tr '[:upper:]' '[:lower:]')"

  # Remove trailing period if present (commitlint subject-full-stop rule)
  description="$(printf "%s" "$description" | sed -E 's/\.$//')"

  # Build header: type(scope): description  or  type: description
  local header
  if [[ -n "$commit_scope" ]]; then
    header="${commit_type}(${commit_scope}): ${description}"
  else
    header="${commit_type}: ${description}"
  fi

  # Truncate header to 100 chars (commitlint header-max-length)
  if [[ ${#header} -gt 100 ]]; then
    header="${header:0:100}"
  fi

  # Full message with footer (blank line before footer per commitlint body-leading-blank)
  printf "%s\n\nCloses #%s" "$header" "$issue_num"
}

RESEARCH_AGENT=""
IMPLEMENT_AGENT=""
REVIEW_A_AGENT=""
REVIEW_B_AGENT=""
FINALIZE_AGENT=""
MAX_ISSUES=""
TARGET_ISSUE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --research|--implement|--review-a|--review-b|--finalize|--max-issues|--issue)
      [[ $# -ge 2 ]] || die "Option $1 requires an argument."
      case "$1" in
        --research)  RESEARCH_AGENT="$2" ;;
        --implement) IMPLEMENT_AGENT="$2" ;;
        --review-a)  REVIEW_A_AGENT="$2" ;;
        --review-b)  REVIEW_B_AGENT="$2" ;;
        --finalize)  FINALIZE_AGENT="$2" ;;
        --max-issues) MAX_ISSUES="$2" ;;
        --issue) TARGET_ISSUE="$2" ;;
      esac
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$RESEARCH_AGENT" && -n "$IMPLEMENT_AGENT" && -n "$REVIEW_A_AGENT" && -n "$REVIEW_B_AGENT" ]] || {
  usage
  exit 1
}

if [[ -n "$MAX_ISSUES" ]]; then
  validate_positive_integer "$MAX_ISSUES" "--max-issues"
fi

if [[ -n "$TARGET_ISSUE" ]]; then
  validate_positive_integer "$TARGET_ISSUE" "--issue"
  if [[ -z "$MAX_ISSUES" ]]; then
    MAX_ISSUES=1
  elif (( MAX_ISSUES > 1 )); then
    warn "--issue was provided with --max-issues=$MAX_ISSUES; reducing --max-issues to 1."
    MAX_ISSUES=1
  fi
fi

validate_agent "$RESEARCH_AGENT"
validate_agent "$IMPLEMENT_AGENT"
validate_agent "$REVIEW_A_AGENT"
validate_agent "$REVIEW_B_AGENT"

if [[ -z "$FINALIZE_AGENT" ]]; then
  FINALIZE_AGENT="$IMPLEMENT_AGENT"
fi
validate_agent "$FINALIZE_AGENT"

require_cmd git
require_cmd gh
require_cmd jq

needs_claude=false
needs_codex=false
needs_opencode=false
for agent in "$RESEARCH_AGENT" "$IMPLEMENT_AGENT" "$REVIEW_A_AGENT" "$REVIEW_B_AGENT" "$FINALIZE_AGENT"; do
  case "$agent" in
    claude) needs_claude=true ;;
    codex) needs_codex=true ;;
    opencode) needs_opencode=true ;;
  esac
done

if $needs_claude; then
  require_cmd claude
fi
if $needs_codex; then
  require_cmd codex
fi
if $needs_opencode; then
  require_cmd opencode
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repository."
cd "$repo_root" || die "Failed to change directory to repo root: $repo_root"

gh auth status >/dev/null 2>&1 || die "gh is not authenticated. Run 'gh auth login'."

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[[ "$current_branch" != "HEAD" ]] || die "Detached HEAD. Checkout a branch before running."
target_branch="$current_branch"

if [[ -n "$(git status --porcelain)" ]]; then
  warn "Working tree is not clean. Continuing with uncommitted changes."
fi

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

completed_issues=0
while true; do
  if [[ -n "$MAX_ISSUES" && "$completed_issues" -ge "$MAX_ISSUES" ]]; then
    echo "Reached --max-issues limit ($MAX_ISSUES). Exiting."
    exit 0
  fi

  if [[ -n "$TARGET_ISSUE" ]]; then
    issue_number="$TARGET_ISSUE"
    issue_state="$(gh issue view "$issue_number" --json state -q .state 2>/dev/null || true)"
    if [[ -z "$issue_state" ]]; then
      die "Issue #$issue_number was not found or is inaccessible."
    fi
    if [[ "$issue_state" != "OPEN" ]]; then
      echo "Issue #$issue_number is not open (state: $issue_state). Exiting."
      exit 0
    fi
  else
    if ! issues_json="$(gh api graphql --paginate --slurp -F owner="$owner" -F name="$repo" -f query="$gql")"; then
      warn "Failed to query issues. Retrying."
      sleep_briefly
      continue
    fi

    if ! issue_number="$(printf "%s" "$issues_json" | jq '[.[].data.repository.issues.nodes[].number] | min')"; then
      warn "Failed to parse issue list."
      sleep_briefly
      continue
    fi

    if [[ -z "$issue_number" || "$issue_number" == "null" ]]; then
      echo "No open issues found. Exiting."
      exit 0
    fi
  fi

  issue_dir="logs/issues/$issue_number"
  mkdir -p "$issue_dir"

  issue_title="$(gh issue view "$issue_number" --json title -q .title 2>/dev/null || true)"
  if [[ -z "$issue_title" ]]; then
    warn "Issue title unavailable for #$issue_number."
    issue_title="(title unavailable)"
  fi
  issue_json="$issue_dir/issue.json"
  if ! gh issue view "$issue_number" --json number,title,body,author,labels,assignees,comments,createdAt,updatedAt,url --comments > "$issue_json"; then
    warn "Failed to write issue snapshot for #$issue_number."
  fi

  research_file="$issue_dir/research.md"
  implementation_file="$issue_dir/implementation.md"
  review_a_file="$issue_dir/review-1.md"
  review_b_file="$issue_dir/review-2.md"
  finalize_file="$issue_dir/finalization.md"

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
- If any expected file is missing, ignore it and continue. Do your best and do not error out.
EOF
)

  if ! run_agent "$RESEARCH_AGENT" "$research_prompt"; then
    warn "Research agent exited non-zero. Continuing."
  fi
  [[ -s "$research_file" ]] || warn "Research file missing or empty: $research_file (continuing)."

  while true; do
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
- Check uncommitted files and existing artifacts; proceed even if some are missing. Do your best and do not error out.
EOF
)

    if ! run_agent "$IMPLEMENT_AGENT" "$implement_prompt"; then
      warn "Implementer agent exited non-zero. Continuing."
    fi
    [[ -s "$implementation_file" ]] || warn "Implementation file missing or empty: $implementation_file (continuing)."

    review_a_prompt=$(cat <<EOF
You are Reviewer A for GitHub issue #$issue_number. Focus: correctness of the uncommitted changes.

Requirements:
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Check clean code, regressions, bugs, correctness, edge cases, complexity and maintainability, naming conventions, DRY, documentation within the code, test quality and coverage, separation of concerns, scalability, security, vulnerabilities, efficiency, UX-
- Run tests if available; if none are found, say so explicitly.
- Run pnpm lint; if it fails, start with DENIED and explain why.
- Run pnpm typecheck; if it fails, start with DENIED and explain why.
- First word MUST be ACCEPTED or DENIED followed by ONE space!
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_a_file

Important:
- Do NOT pipe output to a file. Write the file directly.
- Check uncommitted files and existing artifacts; proceed even if some are missing. Do your best and do not error out.
EOF
)

    if ! run_agent "$REVIEW_A_AGENT" "$review_a_prompt"; then
      warn "Reviewer A agent exited non-zero. Continuing."
    fi
    [[ -s "$review_a_file" ]] || warn "Review A file missing or empty: $review_a_file (continuing)."

    review_b_prompt=$(cat <<EOF
You are Reviewer B for GitHub issue #$issue_number. Focus: do the uncommitted changes solve the issue?

Requirements:
- Read the issue and comments, then evaluate the changes against the requirements. The goal is to PROOF, that the changes solve the given issue completely.
- Review the uncommitted changes (git diff, git status). Include untracked files!
- Run tests if available; if none are found, say so explicitly.
- Run pnpm lint; if it fails, start with DENIED and explain why.
- Run pnpm typecheck; if it fails, start with DENIED and explain why.
- First word MUST be ACCEPTED or DENIED.
- If ANY concern exists, start with DENIED. Only start with ACCEPTED if there are NO concerns.
- Write your review to: $review_b_file

Important:
- Write findings to the review document directly.
- Check uncommitted files and existing artifacts; proceed even if some are missing. Do your best and do not error out.
EOF
)

    if ! run_agent "$REVIEW_B_AGENT" "$review_b_prompt"; then
      warn "Reviewer B agent exited non-zero. Continuing."
    fi
    [[ -s "$review_b_file" ]] || warn "Review B file missing or empty: $review_b_file (continuing)."

    review_a_word="$(first_word "$review_a_file")"
    review_b_word="$(first_word "$review_b_file")"

    if [[ "$review_a_word" == "ACCEPTED" && "$review_b_word" == "ACCEPTED" ]]; then
      if ! pnpm lint; then
        warn "pnpm lint failed. Restarting implementation loop."
        continue
      fi
      break
    fi

    echo "Reviews not accepted or missing. Restarting implementation loop."
  done

  commit_msg="$(build_commit_message "$issue_json" "$issue_number" "$issue_title")"
  commit_msg_file="$issue_dir/commit-message.txt"
  printf "%s\n" "$commit_msg" > "$commit_msg_file"

  if [[ -z "$(git status --porcelain)" ]]; then
    warn "No uncommitted changes available to finalize for issue #$issue_number."
    if [[ -n "$TARGET_ISSUE" ]]; then
      exit 0
    fi
    continue
  fi

  finalize_prompt=$(cat <<EOF
You are the Finalizer Agent for GitHub issue #$issue_number in this repository.

Requirements:
- Read the issue and comments with gh before finalizing.
- Review and stage all relevant uncommitted changes.
- Run pnpm typecheck and pnpm lint before committing. If they fail, fix the code and rerun until they pass.
- Commit using this exact commit message file: $commit_msg_file
- Push to branch: $target_branch
- Close issue #$issue_number with a short comment after a successful push.
- Write a summary to: $finalize_file (Markdown), including commands run and final git status.

Important:
- Do not use interactive git commands.
- Do not skip hooks.
- Do your best and do not error out if a single command fails; recover and continue until complete.
EOF
)

  finalize_attempt=0
  while true; do
    finalize_attempt=$((finalize_attempt + 1))

    if ! run_agent "$FINALIZE_AGENT" "$finalize_prompt"; then
      warn "Finalizer agent exited non-zero on attempt $finalize_attempt for issue #$issue_number."
    fi

    [[ -s "$finalize_file" ]] || warn "Finalization file missing or empty: $finalize_file (continuing)."

    if ! is_head_pushed "$target_branch"; then
      warn "Finalizer attempt $finalize_attempt did not push HEAD to origin/$target_branch for issue #$issue_number."
      sleep_briefly
      continue
    fi

    if ! is_issue_closed "$issue_number"; then
      warn "Finalizer attempt $finalize_attempt did not close issue #$issue_number."
      sleep_briefly
      continue
    fi

    break
  done

  echo "Completed issue #$issue_number."
  completed_issues=$((completed_issues + 1))
done
