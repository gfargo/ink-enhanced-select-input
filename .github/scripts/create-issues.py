#!/usr/bin/env python3
"""Create GitHub issues from .github/ISSUE-BACKLOG.md via the gh CLI.

The backlog markdown is the single source of truth: each `### <ID> — <Title>`
section becomes one issue. Nothing here is hardcoded, so editing the markdown
and re-running is always safe (use --only to file a subset).

Usage:
    # See exactly what would be filed, without touching GitHub (no auth needed)
    ./.github/scripts/create-issues.py --dry-run

    # File the four P0s first to eyeball the formatting
    ./.github/scripts/create-issues.py --only B1,B2,B3,T1

    # File everything
    ./.github/scripts/create-issues.py

    # File one section
    ./.github/scripts/create-issues.py --section B

Requires: gh CLI authenticated with repo scope (`gh auth login`).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKLOG = REPO_ROOT / ".github" / "ISSUE-BACKLOG.md"

# Section heading: "### B1 — Ctrl and Alt chords fire item hotkeys"
HEADING_RE = re.compile(r"^### (?P<id>[BTRF]\d+) — (?P<title>.+?)\s*$")
# Any other markdown heading — used to bound the last section so it doesn't
# swallow the trailing "## Test debt" / "## Suggested sequencing" sections.
ANY_HEADING_RE = re.compile(r"^#{1,3} ")
# Metadata line, matched against a SINGLE line only:
#   "**Labels:** `bug` · **Severity:** P0 · **[verified]**"
# Anchoring to one line matters: a multiline match runs past the metadata and
# turns every backticked code span in the body into a "label".
LABELS_LINE_RE = re.compile(r"^\*\*Labels:\*\*(?P<labels>.*)$")
SEVERITY_RE = re.compile(r"\*\*Severity:\*\*\s*(?P<sev>P\d)")
BACKTICKED_RE = re.compile(r"`([^`]+)`")

# Conventional-commit prefix per primary label, matching this repo's history.
PREFIX_BY_LABEL = {
    "bug": "fix",
    "enhancement": "feat",
    "chore": "chore",
    "documentation": "docs",
    "refactor": "refactor",
    "performance": "perf",
}

# Labels that may not exist on the repo yet. color/description used on create.
LABEL_DEFS = {
    "bug": ("d73a4a", "Something isn't working"),
    "enhancement": ("a2eeef", "New feature or request"),
    "chore": ("fef2c0", "Tooling, packaging, and maintenance"),
    "documentation": ("0075ca", "Documentation improvements"),
    "refactor": ("c5def5", "Internal change with no behaviour change"),
    "performance": ("d4c5f9", "Performance-related work"),
    "severity:P0": ("b60205", "Data loss or destructive behaviour"),
    "severity:P1": ("d93f0b", "Wrong behaviour users will hit"),
    "severity:P2": ("fbca04", "Rough edge"),
    "severity:P3": ("0e8a16", "Polish and forward-compatibility"),
}

SECTION_NAMES = {
    "B": "Bugs",
    "T": "Packaging & tooling",
    "R": "Refactors",
    "F": "Features",
}


@dataclass
class Issue:
    ident: str
    title: str
    body: str
    labels: list[str] = field(default_factory=list)
    severity: str | None = None

    @property
    def prefix(self) -> str:
        for label in self.labels:
            if label in PREFIX_BY_LABEL:
                return PREFIX_BY_LABEL[label]
        return "chore"

    @property
    def full_title(self) -> str:
        return f"{self.prefix}: {self.title}"

    @property
    def all_labels(self) -> list[str]:
        labels = list(self.labels)
        if self.severity:
            labels.append(f"severity:{self.severity}")
        return labels


def parse_backlog(path: Path) -> list[Issue]:
    if not path.exists():
        sys.exit(f"error: backlog not found at {path}")

    lines = path.read_text(encoding="utf-8").splitlines()

    # Locate each heading, then take the body up to the next heading.
    starts: list[tuple[int, str, str]] = []
    for index, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if match:
            starts.append((index, match.group("id"), match.group("title")))

    issues: list[Issue] = []
    unknown_labels: set[str] = set()

    for position, (line_no, ident, title) in enumerate(starts):
        # Bound the block at the next issue heading, or at any other heading
        # (so the final entry stops before "## Test debt" rather than at EOF).
        limit = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        end = limit
        for index in range(line_no + 1, limit):
            if ANY_HEADING_RE.match(lines[index]):
                end = index
                break

        block = lines[line_no + 1 : end]

        # Drop the trailing `---` separator and surrounding blank lines.
        while block and block[-1].strip() in {"", "---"}:
            block.pop()

        labels: list[str] = []
        severity: str | None = None
        for line in block:
            label_match = LABELS_LINE_RE.match(line.strip())
            if label_match:
                found = BACKTICKED_RE.findall(label_match.group("labels"))
                # Only accept labels from the known vocabulary; anything else is
                # a formatting slip in the markdown and should be surfaced, not
                # silently turned into a new GitHub label.
                labels = [name for name in found if name in LABEL_DEFS]
                unknown_labels.update(name for name in found if name not in LABEL_DEFS)
                severity_match = SEVERITY_RE.search(line)
                if severity_match:
                    severity = severity_match.group("sev")
                break

        if not labels:
            print(f"warning: {ident} has no recognised labels", file=sys.stderr)

        # The "**Labels:**" line becomes real GitHub labels, so drop it from the
        # body rather than repeating it as text.
        body_lines = [
            line for line in block if not LABELS_LINE_RE.match(line.strip())
        ]
        while body_lines and not body_lines[0].strip():
            body_lines.pop(0)

        issues.append(
            Issue(
                ident=ident,
                title=title,
                body=build_body(ident, "\n".join(body_lines).strip()),
                labels=labels,
                severity=severity,
            )
        )

    if unknown_labels:
        print(
            f"warning: ignoring unrecognised label(s): {', '.join(sorted(unknown_labels))}",
            file=sys.stderr,
        )

    return issues


def build_body(ident: str, raw: str) -> str:
    section = SECTION_NAMES.get(ident[0], "Backlog")
    footer = (
        "\n\n---\n\n"
        f"Filed from [`.github/ISSUE-BACKLOG.md`]"
        f"(https://github.com/gfargo/ink-enhanced-select-input/blob/main/.github/ISSUE-BACKLOG.md) "
        f"— section *{section}*, ID **{ident}**. Cross-references such as **B12** or **R2** in the "
        "text refer to other IDs in that document."
    )
    return raw + footer


def run_gh(args: list[str], dry_run: bool) -> str | None:
    printable = "gh " + " ".join(args)
    if dry_run:
        print(f"    [dry-run] {printable[:150]}")
        return None
    result = subprocess.run(
        ["gh", *args], capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        print(f"    ! failed: {stderr}", file=sys.stderr)
        return None
    return result.stdout.strip()


def ensure_labels(repo: str, needed: set[str], dry_run: bool) -> None:
    existing: set[str] = set()
    if not dry_run:
        out = run_gh(
            ["label", "list", "--repo", repo, "--limit", "200", "--json", "name"],
            dry_run=False,
        )
        if out:
            try:
                existing = {entry["name"] for entry in json.loads(out)}
            except (json.JSONDecodeError, KeyError, TypeError):
                existing = set()

    missing = sorted(needed - existing)
    if not missing:
        print("Labels: all present.")
        return

    print(f"Labels: creating {len(missing)} missing → {', '.join(missing)}")
    for name in missing:
        color, description = LABEL_DEFS.get(name, ("ededed", ""))
        run_gh(
            [
                "label", "create", name,
                "--repo", repo,
                "--color", color,
                "--description", description,
                "--force",
            ],
            dry_run,
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo", default="gfargo/ink-enhanced-select-input", help="owner/name"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="print what would happen, call nothing"
    )
    parser.add_argument("--only", help="comma-separated IDs, e.g. B1,B2,T1")
    parser.add_argument("--section", help="single section letter: B, T, R or F")
    parser.add_argument(
        "--show",
        metavar="ID",
        help="print the exact title/labels/body for one ID and exit",
    )
    parser.add_argument(
        "--no-severity-labels",
        action="store_true",
        help="skip the severity:P* labels",
    )
    args = parser.parse_args()

    issues = parse_backlog(BACKLOG)
    if not issues:
        sys.exit("error: no issues parsed — has the markdown format changed?")

    if args.show:
        target = args.show.strip().upper()
        for issue in issues:
            if issue.ident == target:
                print(f"TITLE:  {issue.full_title}")
                print(f"LABELS: {', '.join(issue.all_labels) or '(none)'}")
                print("BODY:")
                print("-" * 72)
                print(issue.body)
                print("-" * 72)
                return 0
        sys.exit(f"error: unknown ID {target}")

    if args.only:
        wanted = {value.strip().upper() for value in args.only.split(",")}
        unknown = wanted - {issue.ident for issue in issues}
        if unknown:
            sys.exit(f"error: unknown IDs: {', '.join(sorted(unknown))}")
        issues = [issue for issue in issues if issue.ident in wanted]
    if args.section:
        letter = args.section.strip().upper()
        issues = [issue for issue in issues if issue.ident.startswith(letter)]
        if not issues:
            sys.exit(f"error: no issues in section {letter}")

    if args.no_severity_labels:
        for issue in issues:
            issue.severity = None

    print(f"Backlog: {BACKLOG.relative_to(REPO_ROOT)}")
    print(f"Repo:    {args.repo}")
    print(f"Filing:  {len(issues)} issue(s)")
    if args.dry_run:
        print("Mode:    DRY RUN — no GitHub calls will be made")
    print()

    needed = {label for issue in issues for label in issue.all_labels}
    ensure_labels(args.repo, needed, args.dry_run)
    print()

    created = 0
    failed: list[str] = []
    for issue in issues:
        label_text = ", ".join(issue.all_labels) or "(none)"
        print(f"[{issue.ident}] {issue.full_title}")
        print(f"    labels: {label_text}  |  body: {len(issue.body)} chars")

        cmd = [
            "issue", "create",
            "--repo", args.repo,
            "--title", issue.full_title,
            "--body", issue.body,
        ]
        for label in issue.all_labels:
            cmd += ["--label", label]

        if args.dry_run:
            print("    [dry-run] gh issue create …")
            created += 1
            continue

        url = run_gh(cmd, dry_run=False)
        if url:
            print(f"    → {url}")
            created += 1
        else:
            failed.append(issue.ident)

    print()
    print(f"Done: {created}/{len(issues)} filed.")
    if failed:
        print(f"Failed: {', '.join(failed)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
