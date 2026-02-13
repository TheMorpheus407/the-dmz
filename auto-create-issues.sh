#!/usr/bin/env bash
set -uo pipefail

usage() {
  cat <<'EOF'
Usage: auto-create-issues.sh --agent <claude|codex|opencode> --milestone <number>

Options:
  --agent      Agent runner to use for issue creation (claude, codex, or opencode)
  --milestone  Milestone number from docs/MILESTONES.md (for example: 0, 1, 2)
               Special value: 1337 => bug-fix discovery mode (not a docs milestone)
  -h, --help   Show this help text
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

warn() {
  echo "WARN: $*" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
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

normalize_word() {
  local word="${1:-}"
  printf "%s" "$word" | tr -cd '[:alnum:]_' | tr '[:lower:]' '[:upper:]'
}

first_word() {
  local file="$1"
  [[ -s "$file" ]] || { echo ""; return 0; }
  awk '{for (i = 1; i <= NF; i++) { print $i; exit }}' "$file"
}

last_word() {
  local file="$1"
  [[ -s "$file" ]] || { echo ""; return 0; }
  awk '{for (i = 1; i <= NF; i++) { last = $i }} END { print last }' "$file"
}

validate_milestone() {
  local milestone="$1"
  [[ "$milestone" =~ ^[0-9]+$ ]] || die "Milestone must be a number (received: $milestone)"
}

validate_docs_milestone() {
  local milestone="$1"
  [[ -f "docs/MILESTONES.md" ]] || die "docs/MILESTONES.md not found."

  if command -v rg >/dev/null 2>&1; then
    rg -q "^### M${milestone}:" docs/MILESTONES.md || die "Milestone M${milestone} was not found in docs/MILESTONES.md."
  else
    grep -Eq "^### M${milestone}:" docs/MILESTONES.md || die "Milestone M${milestone} was not found in docs/MILESTONES.md."
  fi
}

milestone_heading_line() {
  local milestone="$1"
  if command -v rg >/dev/null 2>&1; then
    rg "^### M${milestone}:" docs/MILESTONES.md | head -n 1
  else
    grep -E "^### M${milestone}:" docs/MILESTONES.md | head -n 1
  fi
}

AGENT=""
MILESTONE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      [[ $# -ge 2 ]] || die "Option --agent requires an argument."
      AGENT="$2"
      shift 2
      ;;
    --milestone)
      [[ $# -ge 2 ]] || die "Option --milestone requires an argument."
      MILESTONE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$AGENT" && -n "$MILESTONE" ]] || {
  usage
  exit 1
}

validate_agent "$AGENT"
require_cmd git
require_cmd gh
if [[ "$AGENT" == "claude" ]]; then
  require_cmd claude
elif [[ "$AGENT" == "codex" ]]; then
  require_cmd codex
else
  require_cmd opencode
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Not inside a git repository."
cd "$repo_root" || die "Failed to change directory to repo root: $repo_root"

gh auth status >/dev/null 2>&1 || die "gh is not authenticated. Run 'gh auth login'."
validate_milestone "$MILESTONE"

BUGFIX_MODE=false
if [[ "$MILESTONE" == "1337" ]]; then
  BUGFIX_MODE=true
else
  validate_docs_milestone "$MILESTONE"
fi

milestone_heading=""
if ! $BUGFIX_MODE; then
  milestone_heading="$(milestone_heading_line "$MILESTONE")"
fi

log_dir="logs/issue-creation/m${MILESTONE}"
mkdir -p "$log_dir"

iteration=0
done_streak=0
while true; do
  iteration=$((iteration + 1))
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  output_file="$log_dir/iteration-${iteration}-${timestamp}.txt"

  if $BUGFIX_MODE; then
    prompt=$(cat <<EOF
You are the Issue Planning Agent in bug-fix discovery mode for this repository.

Goal:
- Find exactly ONE real bug in the current codebase and create exactly ONE GitHub issue for it.
- Use Bash and gh CLI yourself to create the issue.
- Do not ask the caller to run gh commands.

Required reading before deciding:
- SOUL.md
- MEMORY.md
- AGENTS.md
- docs/BRD.md
- docs/story.md
- docs/DD/*
- Relevant docs/BRD/* files
- Existing open issues via gh (bug-fix mode duplicate check is OPEN issues only)

Issue creation rules:
- Title format MUST be: M1337-X: <concise bug title>
- Determine X as the next logical sequence number for M1337 issues.
- This is not a real milestone from docs; do not rely on docs milestone lookup.
- Do not set a GitHub milestone field for M1337 issues.
- No mandatory labels. You may apply any existing repository labels you judge useful.
- Include a detailed body modeled after solved M0 issues (for structure):
  - Summary
  - Requirements / reproduction details
  - Acceptance Criteria checklist
  - Dependencies / references if applicable
- Before drafting, inspect at least one solved M0 issue body for style reference (for example from logs/issues/*/issue.json or gh issue view on a closed M0 issue).

Deduplication rules:
- In bug-fix mode, avoid duplicates against OPEN issues only.

Termination rule:
- If no new bug issue remains to define right now, output DONE as the first word and DONE as the last word.

Output rules:
- If you create an issue, include issue number and URL in the final response.
- If no issue remains, output DONE ... DONE.
EOF
)
  else
    prompt=$(cat <<EOF
You are the Issue Planning Agent for milestone M${MILESTONE} in this repository.
Milestone reference from docs/MILESTONES.md: ${milestone_heading}

Goal:
- Create exactly ONE next logical GitHub issue for milestone M${MILESTONE}.
- Use Bash and gh CLI yourself to create the issue.
- Do not ask the caller to run gh commands.

Required reading before deciding:
- SOUL.md
- MEMORY.md
- AGENTS.md
- docs/MILESTONES.md
- docs/BRD.md
- docs/story.md
- docs/DD/*
- Relevant docs/BRD/* files
- Existing GitHub issues/comments via gh

Issue creation rules:
- Title format MUST be: M${MILESTONE}-X: <concise title>
- Determine X as the next logical sequence number for this milestone.
- Set the GitHub issue milestone when creating the issue.
- No mandatory labels. You may apply any existing repository labels you judge useful.
- Include a detailed body modeled after solved M0 issues (for structure):
  - Summary
  - Requirements
  - Acceptance Criteria checklist
  - Dependencies / references
- Before drafting, inspect at least one solved M0 issue body for style reference (for example from logs/issues/*/issue.json or gh issue view on a closed M0 issue).

Deduplication rules:
- Check OPEN issues globally.
- Also check CLOSED issues from this same milestone (M${MILESTONE}) to avoid re-creating solved work.

Termination rule:
- If no issue remains to define for milestone M${MILESTONE}, output DONE as the first word and DONE as the last word.

Output rules:
- If you create an issue, include issue number and URL in the final response.
- If no issue remains, output DONE ... DONE.
EOF
)
  fi

  echo "Iteration $iteration: running $AGENT for milestone M$MILESTONE"
  if ! run_agent "$AGENT" "$prompt" >"$output_file" 2>&1; then
    warn "Agent returned non-zero on iteration $iteration. Continuing."
  fi

  first_raw="$(first_word "$output_file")"
  last_raw="$(last_word "$output_file")"
  first_norm="$(normalize_word "$first_raw")"
  last_norm="$(normalize_word "$last_raw")"

  echo "Saved output: $output_file"
  echo "First word: ${first_raw:-<empty>} | Last word: ${last_raw:-<empty>}"

  if [[ "$first_norm" == "DONE" || "$last_norm" == "DONE" ]]; then
    done_streak=$((done_streak + 1))
    echo "DONE detected (${done_streak}/3 consecutive)."
    if [[ "$done_streak" -ge 3 ]]; then
      echo "DONE detected 3 times in a row. Exiting loop."
      exit 0
    fi
  else
    if [[ "$done_streak" -gt 0 ]]; then
      echo "DONE streak reset."
    fi
    done_streak=0
    echo "No DONE token found. Continuing loop."
  fi
done
