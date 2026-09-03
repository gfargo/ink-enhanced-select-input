# Contributor guide for AI assistants

## Branch naming

Use semantic, conventional-commit-style prefixes that describe the work.
**Never use `claude`, `ai`, `bot`, or any assistant/tool name as a branch
prefix or anywhere in a branch name.** A branch name should describe the
change, not who or what authored it.

Use the same type vocabulary as the commit messages:

| Prefix      | Use for                            | Example                            |
| ----------- | ---------------------------------- | ---------------------------------- |
| `feat/`     | New user-facing capability         | `feat/sticky-group-headers`        |
| `fix/`      | Bug fix                            | `fix/navrow-index-projection`      |
| `chore/`    | Deps, tooling, housekeeping        | `chore/bump-ink-7`                 |
| `docs/`     | Documentation only                 | `docs/readme-toc`                  |
| `ci/`       | Workflows and pipeline config      | `ci/coverage-floor`                |
| `refactor/` | Behaviour-preserving restructuring | `refactor/extract-intent-resolver` |
| `test/`     | Test-only changes                  | `test/collapsible-regressions`     |

Keep the description short, lowercase, and hyphen-separated. Reference an
issue number when one exists: `fix/188-match-range-offsets`.

> **Note on Claude Code on the web:** sessions started from the web or mobile
> app are assigned a `claude/<slug>` branch by the platform at session start,
> before this file is read, and the session is instructed not to push
> elsewhere. This convention therefore governs branches created in local CLI
> sessions and any branch created by choice. To control the branch name for a
> remote session, set it when the session is created rather than expecting
> this file to override it.

## Commits and pull requests

- Conventional commits, matching the existing history:
  `type(scope): imperative summary` — e.g.
  `fix(enhanced-select-input): resolve indices against the navigable rows`.
- PRs merge to `main` via **squash**, so the PR title becomes the commit
  subject on `main`. Write it accordingly.
- Releases are automated by release-please off the commit history — an
  inaccurate `type` lands in the changelog, so pick it deliberately.
- Do not credit an assistant or tool in a branch name, commit subject, or
  changelog entry. Co-author trailers are fine.

## Working on this repo

```bash
yarn install --frozen-lockfile
yarn build          # tsc -> dist/
yarn test           # builds, then ava
yarn lint           # prettier --check . && xo
yarn lint:fix
```

- `yarn test` runs `prestart`/`pretest` build hooks; AVA runs the compiled
  output in `dist/`, not the TypeScript sources, so a stale `dist/` means
  stale tests. Rebuild before trusting a run.
- CI runs a matrix of Node 22/24 × TypeScript 6/7. A change that only passes
  on one TypeScript major will fail CI.
- Run `yarn lint` before pushing. `xo` currently emits pre-existing warnings
  (file length, one complexity warning) — zero _errors_ is the bar.

## Architecture notes

Almost everything lives in `src/enhanced-select-input/index.tsx`: pure
helpers, the `useEnhancedSelectInput` hook, and the `EnhancedSelectInput`
renderer. Two thin entrypoints re-export from it — `src/index.tsx` (full
component) and `src/headless.ts` (hook only). **Anything a consumer needs must
be re-exported from those entrypoints; exporting it from the implementation
module alone does not make it public.**

### The two index spaces

This is the single easiest thing to get wrong. There are two parallel arrays:

- `filteredItems` — items after group reordering and search filtering.
- `navRows` — the _navigable row projection_. When `collapsible` is true it
  additionally carries `GroupHeaderRow` entries and omits collapsed groups'
  items. When `collapsible` is false it **is** `filteredItems`, by reference.

`selectedIndex` always indexes `navRows`. Any code resolving, clamping, or
storing a highlight index must resolve against `navRows`, never
`filteredItems` — otherwise it is off by one per preceding group header, and
the bug is invisible until someone enables `collapsible`. Set-membership
operations (`selectAll`, `toggleGroup`, confirm scope) correctly use
`filteredItems`, since those are about items rather than cursor position.

### Keyboard input

`resolveInputIntent` is a pure function mapping `(input, key, context)` to a
single `Intent`. Branch order is load-bearing and first match wins. Every
`keyMap` guard belongs inside the resolver, not the dispatch switch — including
in searchable mode, where ←/→ and Home/End are repurposed to move the search
cursor but must still respect `keyMap.arrows` / `keyMap.homeEnd`.

## Testing expectations

- A bug fix ships with a regression test that has been **verified to fail
  without the fix** — revert the fix, rebuild, watch it fail, restore. A test
  that passes either way proves nothing.
- Pair a `collapsible` test with a non-`collapsible` control so a projection
  change cannot silently alter default behaviour.
- Reuse the existing `HookHarness` component for hook-level tests rather than
  writing an ad-hoc probe; `xo`'s `react-hooks/globals` rule rejects assigning
  to an outer variable from inside a component body.
- Prefer `waitFor(...)` over a bare `delay()` when asserting on state that
  settles asynchronously.
