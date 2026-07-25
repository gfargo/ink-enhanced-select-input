# Issue Backlog — Post-1.1.1 Audit

Audit of `ink-enhanced-select-input@1.1.1` (`main` @ `dc2b02b`), written as **atomic, individually
shippable issues**. Each entry below can be filed and closed on its own — no entry depends on
another being done first, and each has its own acceptance criteria.

**Baseline health:** 167 tests pass, `tsc` clean, `prettier --check` clean, `xo` clean, `npm pack`
contains only the 7 intended files. Everything below is a gap the current suite does not cover.

Items marked **[verified]** were reproduced against `main` with throwaway AVA tests; observed output
is quoted. Items marked **[static]** come from reading the source, `package.json`, or Ink internals.

| Section | Count | IDs |
| --- | --- | --- |
| [Bugs](#bugs) | 25 | `B1`–`B25` |
| [Packaging & tooling](#packaging--tooling) | 7 | `T1`–`T7` |
| [Refactors](#refactors) | 9 | `R1`–`R9` |
| [Features](#features) | 18 | `F1`–`F18` |

Severity: **P0** data loss / destructive · **P1** wrong behaviour users hit · **P2** rough edge ·
**P3** polish.

> **Note:** three existing tests need attention — see [Test debt](#test-debt) at the end. Two of them
> actively assert buggy behaviour and must be rewritten alongside their fix rather than treated as
> regressions.

---

## Bugs

### B1 — Ctrl and Alt chords fire item hotkeys and vim navigation

**Labels:** `bug` · **Severity:** P0 · **[verified]**

Ink sets `input = keypress.name` when ctrl is held, and strips the `\u001B` prefix from Alt
sequences, leaving a bare letter in `input`. Neither the hotkey `find` nor the vim-key branches check
`key.ctrl` or `key.meta`, so modifier chords are indistinguishable from plain letters.

```tsx
<EnhancedSelectInput
  items={[
    { label: 'A', value: 'a' },
    { label: 'Danger', value: 'danger', hotkey: 'x' },
  ]}
  onSelect={(i) => console.log(i.label)}
/>
```

```
Ctrl+X (\u0018)  → selected = "Danger"    ← should be nothing
Alt+X  (\u001Bx) → selected = "Danger"    ← should be nothing
Ctrl+K (\u000B)  → navigates up (A → C, wrapping)
```

`Ctrl+C`/`Ctrl+D`/`Ctrl+W`/`Ctrl+X` are ordinary terminal chords. Any app that binds a destructive
action to a hotkey can have it fired by one.

**Fix:** require `!key.ctrl && !key.meta` before matching item hotkeys or vim navigation keys.

**Acceptance criteria**
- [ ] `Ctrl+<letter>` does not fire an item hotkey whose value is that letter
- [ ] `Alt+<letter>` does not fire an item hotkey whose value is that letter
- [ ] `Ctrl+J`/`Ctrl+K`/`Ctrl+H`/`Ctrl+L` do not navigate
- [ ] Plain `j`/`k`/`h`/`l` and plain hotkeys still work (no regression)

---

### B2 — `onConfirm` drops checked items hidden by the active search filter

**Labels:** `bug` · **Severity:** P0 · **[verified]**

`onConfirm` is built from `filteredItems` rather than `items`:

```ts
const confirmed = filteredItems.filter((item) => checkedKeys.has(itemKey(item)))
```

```
check Apple, check Banana, type "cher", press Enter
→ confirmed = []        ← both selections silently lost
```

`checkedKeys` still holds `apple` and `banana`; the data is discarded on the way to the callback.
Silent data loss in the exact flow `searchable` + `multiple` exists to serve.

**Fix:** confirm from `items`. If filtered-scope confirm is wanted anywhere, add
`confirmScope?: 'all' | 'filtered'` defaulting to `'all'`.

**Acceptance criteria**
- [ ] Items checked before a filter is typed are included in `onConfirm`
- [ ] Existing test `searchable + multiple: can filter then confirm checked items` rewritten (it
      currently asserts the data loss — see [Test debt](#test-debt))
- [ ] Regression test: check across two different queries, confirm, expect both

---

### B3 — Space then Enter in the same tick confirms a stale selection

**Labels:** `bug` · **Severity:** P0 · **[verified]**

The Enter branch reads `checkedKeys` from the render closure. A Space toggle queued in the same tick
has not been committed yet, so Enter confirms the pre-toggle set.

```
stdin.write(' '); stdin.write('\r')   // same tick, no await
→ confirmed = []                       ← the toggle was lost
```

Trivially reachable: a user who taps space and immediately hits enter loses their selection. Distinct
from **B12** — this is the `checkedKeys` read in the Enter branch, not `setSelectedIndex`.

**Fix:** hold checked state in a ref alongside the state (or use a reducer) so the Enter branch reads
the committed value.

**Acceptance criteria**
- [ ] `Space` + `Enter` written in the same tick confirms the toggled item
- [ ] Same for several toggles followed by Enter in one tick

---

### B4 — Disabled items pre-checked via `defaultSelectedKeys` can never be unchecked

**Labels:** `bug` · **Severity:** P1 · **[verified]**

`defaultSelectedKeys` is not validated against `disabled`, and the Space handler skips disabled
items — so a pre-checked disabled item is permanently locked into every `onConfirm`, and navigation
can't even reach it.

```tsx
items={[{ label: 'A', value: 'a' }, { label: 'Locked', value: 'locked', disabled: true }]}
defaultSelectedKeys={['locked']}
```

```
[ ] A
[x] Locked        ← unreachable, un-uncheckable
confirmed = ["a", "locked"]
```

**Fix:** decide the contract and enforce it — either drop disabled keys when seeding `checkedKeys`,
or allow toggling a checked-but-disabled item off. Document whichever.

**Acceptance criteria**
- [ ] A disabled item in `defaultSelectedKeys` behaves per the documented contract
- [ ] `onConfirm` never contains an item the user cannot see or unset

---

### B5 — Escape is swallowed on an empty list, so `onCancel` never fires

**Labels:** `bug` · **Severity:** P1 · **[verified]**

The bail-out sits above the cancel handler:

```ts
if (!hasItems && !searchable) return
…
if (km.cancel && key.escape) { onCancel?.(); return }
```

```tsx
<EnhancedSelectInput items={[]} onCancel={() => setView('back')} />
// Escape → onCancel never fires
```

An empty list is both a normal loading state and exactly when a user wants to back out. In a
multi-step flow they are stuck with no working key. An all-disabled list *does* allow Escape, which
makes the inconsistency plain.

**Fix:** handle Escape (and the other `keyMap`-gated global keys) before the `hasItems` guard.

**Acceptance criteria**
- [ ] `onCancel` fires on Escape when `items` is empty
- [ ] Still respects `keyMap={{ cancel: false }}`

---

### B6 — `onHighlight` refires on every parent re-render when the callback is inline

**Labels:** `bug` · **Severity:** P1 · **[verified]**

```ts
}, [selectedIndex, onHighlight, hasItems])
```

An inline arrow function — what the README itself shows — is a new reference every render, so the
effect re-runs every render:

```
onHighlight calls after mount: 1  →  after 5 parent re-renders: 6
```

A consumer calling `setState` inside `onHighlight` gets an infinite render loop. Same class as
[#17](https://github.com/gfargo/ink-enhanced-select-input/issues/17), which was closed by removing
`items` from the deps while leaving `onHighlight` in — a half fix.

**Fix:** keep the callback in a ref and depend only on what represents a real highlight change.

**Acceptance criteria**
- [ ] N parent re-renders with an inline `onHighlight` produce exactly one call
- [ ] `setState` inside `onHighlight` does not loop

---

### B7 — `onHighlight` reports a stale item when filtering swaps the item at the same index

**Labels:** `bug` · **Severity:** P1 · **[verified]**

The effect keys off `selectedIndex`. Typing resets the index to `0`, but if it was *already* `0` the
effect never re-runs even though a different item is now highlighted.

```
items: Apple, Banana — searchable
initial highlights: ["Apple"]
after typing "b":   ["Apple"]     ← "> Banana" is on screen
```

The component renders `> Banana` while the consumer's last `onHighlight` said `Apple`. Any
detail/preview pane driven off `onHighlight` shows the wrong content.

**Fix:** track the previously highlighted item *identity* (`itemKey`) rather than its index.

**Acceptance criteria**
- [ ] `onHighlight` fires with `Banana` after filtering to it from index 0
- [ ] No duplicate call when the same item stays highlighted

---

### B8 — `onToggle` fires twice under React StrictMode

**Labels:** `bug` · **Severity:** P1 · **[verified]**

`onToggle` is invoked *inside* the `setCheckedKeys` updater. React may invoke updaters more than
once; StrictMode does so deliberately.

```
onToggle call count for ONE space press = 2   [true, true]
```

Both calls report `true`, so it isn't even a coherent toggle sequence. Consumers that log, POST, or
increment in `onToggle` double-fire.

**Fix:** compute next state outside the updater; call `onToggle` after `setCheckedKeys`, not within.

**Acceptance criteria**
- [ ] One Space press under `<StrictMode>` produces exactly one `onToggle`
- [ ] A StrictMode test pass exists in CI (see **T6**)

---

### B9 — Group headers are not counted against `limit`

**Labels:** `bug` · **Severity:** P1 · **[verified]**

`limit` slices `filteredItems`; headers are injected afterwards during render, so real row count is
`limit + groupsInWindow`.

```tsx
<EnhancedSelectInput limit={3} items={[
  { label: 'A', value: 'a', group: 'G1' }, { label: 'B', value: 'b', group: 'G2' },
  { label: 'C', value: 'c', group: 'G3' }, { label: 'D', value: 'd', group: 'G4' },
]} />
```

```
limit=3 but rendered 6 lines:
── G1 ──
> A
── G2 ──
  B
── G3 ──
  C
```

`limit` is documented as "Max number of visible items" and is the only tool for fitting a list to a
known terminal height. With groups it becomes unpredictable — up to double — which overflows the
viewport and makes Ink scroll/tear.

**Fix:** decide whether `limit` counts rows or items and document it; either budget headers into the
slice or add a separate `maxRows`.

**Acceptance criteria**
- [ ] Rendered line count with groups is predictable from the props
- [ ] Documented in the README `limit` entry

---

### B10 — Non-contiguous items sharing a group render under the wrong header

**Labels:** `bug` · **Severity:** P1 · **[verified]**

Header suppression uses a "already rendered this group name?" `Set` with no adjacency awareness.

```
items: A(Alpha), B(Beta), C(Alpha)

── Alpha ──
> A
── Beta ──
  B
  C          ← C is in Alpha but renders inside the Beta section
```

The render actively misrepresents the data. The component never sorts by group, so any consumer whose
items aren't pre-sorted hits this.

**Fix:** emit a header whenever `item.group !== previousVisibleItem.group`. Optionally stable-sort by
group so a group cannot be split at all.

**Acceptance criteria**
- [ ] `C` renders under its own `── Alpha ──` header
- [ ] Existing test `non-contiguous items with same group get separate headers per window` rewritten
      (see [Test debt](#test-debt))

---

### B11 — `limit` page-flips instead of scrolling; cursor jumps to the top

**Labels:** `bug` · **Severity:** P1 · **[verified]**

`rotateIndex = Math.floor(nextIndex / limit) * limit` snaps the window to fixed page boundaries.

```
window 0:          after 3rd ArrowDown:
> Item0              > Item3
  Item1                Item4
  Item2                Item5
```

The whole viewport swaps at once and the highlight teleports from the bottom row to the top. Every
comparable component (`ink-select-input`, `fzf`, `gum`) scrolls one row at a time and keeps the
cursor where the eye already is. The most visible UX gap versus the ecosystem.

**Fix:** cursor-following viewport — advance `rotateIndex` only when the cursor would leave the
window, with optional `scrollOffset` padding. Add `paginationMode: 'page' | 'scroll'` if the current
behaviour must be preserved.

**Acceptance criteria**
- [ ] Moving down past the last visible row scrolls by one row, cursor stays on the last row
- [ ] Same in reverse going up
- [ ] Home/End still land on a sane window

---

### B12 — Navigation keypresses in the same tick are coalesced

**Labels:** `bug` · **Severity:** P1 · **[verified]**

`updateSelection` calls `setSelectedIndex(nextIndex)` with a value computed from the render-scoped
`selectedIndex`, so presses delivered before a re-render all read the same stale closure value.

```
start = I0
after 3 same-tick ArrowDowns = I1     ← expected I3
```

The paths that *do* use functional updaters pass the identical test, which pins the diagnosis:

| Handler | Update form | 3 same-tick presses |
| --- | --- | --- |
| Navigation (`updateSelection`) | `setSelectedIndex(next)` | ❌ 1 applied |
| Multi-select toggle | `setCheckedKeys(prev => …)` | ✅ all applied |
| Search input | `setSearchQuery(prev => …)` | ✅ all applied |

Affects held arrow keys (terminal key repeat), fast typists, `stdin` automation, and test harnesses.
Reported externally in [PR #3](https://github.com/gfargo/ink-enhanced-select-input/pull/3) by
@hughescr and closed unmerged — still present. Worth crediting them on the fix.

**Fix:** compute `findNextValidIndex` inside a functional updater.

**Acceptance criteria**
- [ ] 3 same-tick ArrowDowns move 3 positions
- [ ] Held-key repeat sequences land on the correct item
- [ ] `rotateIndex` stays consistent with the final index

---

### B13 — `searchable` + `orientation="horizontal"` renders the search box inline

**Labels:** `bug` · **Severity:** P2 · **[verified]**

The search input is a direct child of the outer `Box`, whose `flexDirection` becomes `row` in
horizontal mode:

```
/ Search...> A    B
```

Prompt and items are mashed onto one line. `showScrollIndicators` rows are affected the same way.

**Fix:** wrap the item row in its own `Box`, keeping the search line in an outer column regardless of
orientation.

**Acceptance criteria**
- [ ] Search prompt renders on its own line above the items in horizontal mode
- [ ] Vertical mode output unchanged

---

### B14 — An item with `hotkey: ''` fires on arrow keys

**Labels:** `bug` · **Severity:** P2 · **[verified]**

Ink sets `input = ''` for arrows and other non-alphanumeric keys. The hotkey `find` compares
`item.hotkey === input` with no emptiness guard, so an empty-string hotkey matches every such key.

```tsx
items={[{ label: 'A', value: 'a' }, { label: 'Oops', value: 'oops', hotkey: '' }]}
```

```
ArrowDown → selected = "Oops"     ← selection fired from a navigation key
```

Reachable whenever hotkeys come from config/user data where an empty string is a plausible value.
Compounded by the navigation branch not returning early (see **R7**).

**Fix:** skip hotkey matching when `input` is empty; consider warning in dev on an empty hotkey.

**Acceptance criteria**
- [ ] Arrow keys never fire `onSelect` via hotkey matching
- [ ] Items with a non-empty hotkey still work

---

### B15 — Forward-Delete deletes backwards in searchable mode

**Labels:** `bug` · **Severity:** P2 · **[verified]**

`key.backspace || key.delete` are handled identically:

```
query = "abc"; forward-Delete (\u001B[3~) → "ab"
```

`\u007F` (what most terminals send for Backspace) maps to `key.delete` in Ink, so the `||` was
needed — but it also swallows the real Delete key. Cosmetic today; a genuine bug once the search
field gets a cursor (**F3**).

**Fix:** distinguish the two when cursor support lands; document until then.

**Acceptance criteria**
- [ ] Backspace still deletes the trailing character
- [ ] Behaviour of the forward-Delete key documented or corrected

---

### B16 — `keyMap={{ select: false }}` + `searchable` inserts a carriage return into the query

**Labels:** `bug` · **Severity:** P2 · **[verified]**

With `select` disabled, `key.return` is no longer consumed, so Enter reaches the printable-character
branch, which only guards `!key.ctrl && !key.meta`:

```
query after Enter with select disabled = "\r"
```

The query becomes unmatchable and the stray `\r` corrupts the rendered prompt line.

**Fix:** explicitly exclude `key.return`, `key.tab`, and other non-printables from the search-capture
branch rather than relying on earlier handlers to have consumed them.

**Acceptance criteria**
- [ ] Enter never enters the search query, whatever `keyMap` says
- [ ] Same for Tab

---

### B17 — Duplicate-key dev warning spams the console on every re-render

**Labels:** `bug` · **Severity:** P2 · **[verified]**

The warning lives in an effect keyed on `[items, searchQuery]`; an inline `items` array is a new
reference every render.

```
warnings after mount: 1  →  after 4 re-renders: 5
```

React's own `Encountered two children with the same key` fires alongside it, so two messages per
render. Because `console.warn` interleaves with the Ink frame, it makes the TUI unreadable — a
diagnostic that destroys the thing it's diagnosing.

**Fix:** warn once per distinct duplicate-key set (`useRef` guard) and compare keys by value, not
array identity.

**Acceptance criteria**
- [ ] Duplicate keys warn exactly once per distinct offending set
- [ ] No warning growth across re-renders with a stable item list

---

### B18 — `checkedKeys` retains entries for items that no longer exist

**Labels:** `bug` · **Severity:** P2 · **[verified]**

Nothing prunes `checkedKeys` when `items` changes.

```
check A, remove A from items → checkedKeys = ["a"]
```

`onConfirm` counts against a set containing phantom keys, and an item with the same key returning
later silently comes back **pre-checked**. Likely in search-as-you-type-over-remote-data flows.

**Fix:** intersect `checkedKeys` with current item keys on `items` change, or keep them deliberately
and document it (`pruneCheckedKeys` if both are wanted).

**Acceptance criteria**
- [ ] Documented, tested behaviour when a checked item leaves and re-enters `items`

---

### B19 — Long labels wrap and break the fixed-height `limit` window

**Labels:** `bug` · **Severity:** P2 · **[verified]**

No truncation or width constraint is applied to labels.

```
limit=2 with one 200-char label → 4 rendered lines
```

Same consequence as **B9**: `limit` can't bound rendered height, so lists overflow the terminal.
Common with file paths, git branch names, package descriptions.

**Fix:** see **F8**. At minimum document that `limit` counts items, not rows.

**Acceptance criteria**
- [ ] Rendered height with long labels is predictable, or the limitation is documented

---

### B20 — `defaultSelectedKeys` changes after mount are ignored

**Labels:** `bug` · **Severity:** P2 · **[verified]**

`useState(() => new Set(defaultSelectedKeys ?? []))` reads the prop once.

```
initial ['a']            → [x] A / [ ] B
rerender with ['a','b']  → [x] A / [ ] B      ← unchanged
```

Defensible for a `default*` prop, but there is no controlled escape hatch, so "select all", "restore
saved selection", and "reset" are impossible without remounting via `key`.

**Fix:** document the uncontrolled contract now; **F1** adds the controlled alternative.

**Acceptance criteria**
- [ ] README states `defaultSelectedKeys` is mount-only and shows the `key` remount workaround

---

### B21 — Per-item `indicator` is silently ignored in multi-select mode

**Labels:** `bug` · **Severity:** P2 · **[verified]**

The render guards `item.indicator && !isMultiple`, so custom per-item indicators vanish with no
warning when `multiple` is set.

```
single-select:  * A        multi-select:  [ ] A
                  B                       [ ] B
```

**Fix:** either compose the indicator with the checkbox, or document the precedence explicitly (and
warn in dev when both are supplied).

**Acceptance criteria**
- [ ] Documented or composed behaviour for `item.indicator` + `multiple`

---

### B22 — All-disabled list renders a selection cursor but never fires `onHighlight`

**Labels:** `bug` · **Severity:** P3 · **[verified]**

`resolveInitialIndex` falls back to the clamped index when every item is disabled, so `isSelected` is
true for a disabled row — but the `onHighlight` effect guards on `!highlightedItem.disabled`, so the
consumer is never told.

```
> A          ← green cursor on a disabled item
  B
onHighlight fired 0 times
```

The render says "this is selected"; Enter does nothing and the consumer has no idea anything is
highlighted.

**Fix:** don't paint a selection cursor when the resolved item is disabled (or when nothing is
selectable), so render and callbacks agree.

**Acceptance criteria**
- [ ] No selection cursor when every item is disabled
- [ ] Render state and `onHighlight` agree in all-disabled and empty cases

---

### B23 — `keyMap` has no flag for hotkeys — they're coupled to `select`

**Labels:** `bug` `enhancement` · **Severity:** P3 · **[verified]**

The hotkey branch is gated on `km.select`, so `keyMap={{ select: false }}` disables Enter *and* all
hotkeys with no way to disable just one.

```
hotkey 'q' with keyMap.select=false → does not fire
```

`keyMap` exists to resolve conflicts with app-level bindings, and single-letter hotkeys are the most
conflict-prone binding there is — so this is the flag most likely to be wanted.

**Fix:** add `keyMap.hotkeys?: boolean` (default `true`), independent of `select`. Consider
`keyMap.search` for the searchable capture branch too.

**Acceptance criteria**
- [ ] `keyMap={{ hotkeys: false }}` disables hotkeys but leaves Enter working
- [ ] `keyMap={{ select: false }}` leaves hotkeys working
- [ ] Documented in the `KeyMap` JSDoc and README

---

### B24 — Kitty keyboard protocol key-release events are not filtered

**Labels:** `bug` · **Severity:** P3 · **[static]**

Ink 6.8 parses the Kitty keyboard protocol and forwards
`key.eventType: 'press' | 'repeat' | 'release'` without filtering
(`ink/build/hooks/use-input.js`). This component ignores `eventType`, so on a Kitty-protocol terminal
with enhanced key reporting a single physical press can be handled twice — once on press, once on
release — double-navigating and double-toggling.

Not reproducible via `ink-testing-library` (it doesn't negotiate the protocol), hence `[static]` and
P3 — but cheap insurance as Kitty/Ghostty/WezTerm adoption grows.

**Fix:** early-return unless `key.eventType` is `undefined` or `'press'` (allowing `'repeat'` for
navigation keys is a deliberate nicety).

**Acceptance criteria**
- [ ] Release events are ignored
- [ ] Navigation still responds to `'repeat'` if that's the chosen behaviour

---

### B25 — README documents type names that don't exist, and the headless example is wrong

**Labels:** `documentation` · **Severity:** P3 · **[static]**

Two separate errors:

1. The props table (readme.md lines 322, 323, 333) refers to `FC<IndicatorProps>`, `FC<ItemProps>`,
   and `FC<GroupHeaderProps>`. The actual exports are `IndicatorProperties`, `ItemProperties`,
   `GroupHeaderProperties` — copying from the docs doesn't compile.
2. The headless-hook example (line 292) destructures `{ selectedIndex, visibleItems, itemsAbove,
   itemsBelow }` — notably **not** `rotateIndex` — then compares `i === selectedIndex` at line 301.
   Since `i` indexes the window slice and `selectedIndex` indexes the full filtered array, the
   example highlights the wrong row (or none) whenever `limit` is set. Correct form is
   `i + rotateIndex === selectedIndex`.

**Fix:** correct both. Consider `Props`-suffixed type aliases, and returning `selectedItem` from the
hook (**F13**) so the example needs no index math.

**Acceptance criteria**
- [ ] Every type name in the README resolves against the public exports
- [ ] The headless example highlights correctly with `limit` set

---

## Packaging & tooling

### T1 — `react` and `ink` must be `peerDependencies`, not `dependencies`

**Labels:** `bug` · **Severity:** P0 · **[static]**

Both are hard `dependencies`. For a React component library this is a packaging defect: a consumer
whose `ink`/`react` doesn't dedupe gets a **second copy of React**, and hooks across the two copies
throw `Invalid hook call` / `Cannot read properties of null (reading 'useState')`. It also lets the
library silently override the app's Ink version.

```jsonc
"peerDependencies": { "ink": ">=6", "react": ">=19" },
"devDependencies":  { "ink": "^6.8.0", "react": "^19.2.0" }
```

Highest-impact packaging change in this audit; worth a patch release on its own.

**Acceptance criteria**
- [ ] `ink` and `react` moved to `peerDependencies`, retained as dev deps
- [ ] A smoke install against a host app with its own Ink resolves to one React copy

---

### T2 — Add Ink 7 support

**Labels:** `enhancement` · **Severity:** P1 · **[static]**

`ink@7.1.1` is published; this package allows `^6.0.0` only. Ink 7 raises the floor to **Node >= 22**
(this package declares `>=20`), requires **react >= 19.2.0**, and adds a `react-devtools-core` peer.
Consumers on Ink 7 currently get a duplicated Ink install.

**Acceptance criteria**
- [ ] Test suite green against Ink 7
- [ ] Peer range widened (`>=6` or `^6 || ^7`)
- [ ] `engines.node` and the README compatibility table reconciled per Ink major

---

### T3 — `package.json` missing `repository`, `bugs`, `homepage`, `keywords`

**Labels:** `chore` · **Severity:** P2 · **[static]**

All four confirmed absent. npm shows no repository or issue-tracker link, and the package is
undiscoverable by search for `ink`, `cli`, `select`, `prompt`, `tui`, `react`. Cheapest available
adoption win.

Separately, `changelog.md` is not in the published tarball (`npm pack --dry-run` lists 7 files,
changelog not among them) — worth adding so it's visible on npm.

**Acceptance criteria**
- [ ] All four fields present and correct
- [ ] `changelog.md` included in `files`
- [ ] `npm pack --dry-run` reviewed

---

### T4 — No `packageManager` field; Yarn v1 lockfile with an unpinned CI Yarn

**Labels:** `chore` · **Severity:** P2 · **[static]**

`yarn.lock` is `# yarn lockfile v1`; CI runs bare `yarn install --frozen-lockfile` with `cache: yarn`
and no version pin, so whatever Yarn the runner image ships decides the outcome. Modern Yarn treats a
v1 lockfile as a migration target and `--frozen-lockfile` is deprecated in favour of `--immutable`.
Reproduced locally: Yarn 4 immediately tried to migrate the lockfile and failed the install.

**Acceptance criteria**
- [ ] `packageManager` pinned (+ `corepack enable` in CI) or migrated to a modern Yarn/npm
- [ ] CI install command matches the pinned manager
- [ ] Fresh-clone install verified

---

### T5 — Dependency modernization

**Labels:** `chore` · **Severity:** P2 · **[static]**

`npm outdated` against `main`:

| Package | Current | Latest |
| --- | --- | --- |
| `prettier` | 2.8.8 | 3.9.6 |
| `xo` | 0.59.3 | 4.0.0 |
| `ava` | 6.4.1 | 8.0.1 |
| `@ava/typescript` | 5.0.0 | 7.0.0 |
| `eslint-plugin-react-hooks` | 4.6.2 | 7.1.1 |
| `release-it` | 17.11.0 | 20.2.1 |
| `@release-it/conventional-changelog` | 9.0.4 | 11.0.1 |
| `@types/node` | 22.20.1 | 26.1.1 |
| `typescript` | 5.9.3 | 7.0.2 |
| `ink` | 6.8.0 | 7.1.1 |

Two matter beyond hygiene:

- **`eslint-plugin-react-hooks` v4 predates React 19.** v5+ is what flags the stale-closure and
  exhaustive-deps problems behind **B6**, **B7**, **B12**, and **B3** — the linter that should have
  caught them is too old to do so. Do this one **first**; see also **R5**.
- **`prettier` 2 → 3** reformats the repo; land it as an isolated commit so it doesn't pollute review
  of behavioural changes.

**Acceptance criteria**
- [ ] One PR per upgrade (or per logical group), each green
- [ ] `eslint-plugin-react-hooks` upgrade lands before the B6/B7/B12 fixes

---

### T6 — CI hardening

**Labels:** `chore` · **Severity:** P2 · **[static]**

Current workflow is a single `lint-and-test` job on Node 20/22.

- Add **Node 24** to the matrix (reconcile with Ink 7's Node >= 22 floor, **T2**)
- Add an explicit typecheck step — `tsc` runs only as a side effect of `pretest`, so type regressions
  surface as confusing test failures
- Add coverage reporting (`c8`) with a floor — this audit found 25 bugs against a 167-test suite, so
  measuring what's actually exercised is overdue
- Add a **StrictMode** test pass — **B8** is invisible without one
- Add Dependabot/Renovate (would have surfaced **T2** and **T5** automatically)
- Move publishing to a release workflow with **npm provenance** instead of `release-it` from a laptop

Each bullet is independently shippable; file as sub-issues if preferred.

**Acceptance criteria**
- [ ] Matrix includes Node 24
- [ ] Separate typecheck step
- [ ] Coverage reported with a floor
- [ ] StrictMode suite runs in CI
- [ ] Automated dependency updates enabled
- [ ] Publish happens in CI with provenance

---

### T7 — `.gitignore` hygiene

**Labels:** `chore` · **Severity:** P3 · **[static]**

- `docs` is ignored, so the **F14** docs directory would be silently untracked — a real trap
- `dist` is listed twice (root entry plus the Nuxt block)

**Acceptance criteria**
- [ ] `docs` no longer ignored (or renamed if intentional)
- [ ] Duplicate `dist` removed

---

## Refactors

These are maintainability items with no user-visible behaviour change. Several are the *reason* a bug
above was possible, so pairing them is often cheaper than fixing in isolation.

### R1 — Extract the `useInput` handler into a dispatch table

**Labels:** `refactor` · **[static]**

The handler is ~150 lines of twelve sequential `if` branches carrying an explicit
`// eslint-disable-next-line complexity`. Ordering between branches is load-bearing and undocumented,
which is precisely what let **B1**, **B14**, **B16**, and **B24** through — each is a missing guard
in a branch whose reachability isn't obvious from reading it.

Extract a key-resolution step (normalize `input`/`key` into a single intent: `navigate` / `select` /
`toggle` / `cancel` / `search` / `hotkey` / `jump`), then dispatch. Makes modifier guards a single
choke point rather than eight independent conditions.

**Acceptance criteria**
- [ ] `complexity` suppression removed
- [ ] Modifier guarding happens in exactly one place
- [ ] No behaviour change (existing 167 tests green)

---

### R2 — Derive `rotateIndex` instead of storing it

**Labels:** `refactor` · **[static]**

`rotateIndex` is separate state kept in sync with `selectedIndex` by hand across **six**
`setRotateIndex` call sites (revalidation effect ×2, `updateSelection`, backspace, escape-clear,
search capture) plus its `useState` initializer. Every new code path must remember to update it, and
the formula is duplicated.

It's a pure function of `selectedIndex`, `limit`, and the previous window — derive it (or fold both
into one reducer). Removes the desync class of bug entirely and is a prerequisite for a clean
**B11** fix.

**Acceptance criteria**
- [ ] Single source of truth for the window offset
- [ ] No behaviour change

---

### R3 — Memoize derived values recomputed every render

**Labels:** `refactor` `performance` · **[static]**

Per render, unconditionally: `filteredItems` (full `filter` + two `toLowerCase` per item),
`visibleItems` slice, the `km` object literal, and `safeInitialIndex` via `resolveInitialIndex` —
whose result is used *only* by `useState` initializers and is therefore dead work on every render
after mount.

**Acceptance criteria**
- [ ] `resolveInitialIndex` no longer called on every render
- [ ] Filtering memoized on `[items, searchQuery]`
- [ ] No behaviour change

---

### R4 — Split the overloaded revalidation effect

**Labels:** `refactor` · **[static]**

One effect keyed on `[items, searchQuery]` does two unrelated jobs: emit the dev duplicate-key
warning, and revalidate `selectedIndex`. It also reads `filteredItems`, `selectedIndex`, and `limit`
without declaring them, behind an `exhaustive-deps` suppression.

Because an inline `items` array changes identity every render, the O(n) duplicate-key scan (building
two `Set`s) runs on **every render** — the mechanism behind **B17**.

Split into one effect per responsibility with honest dependency arrays.

**Acceptance criteria**
- [ ] Two focused effects with no `exhaustive-deps` suppression
- [ ] Duplicate-key scan no longer runs on every render

---

### R5 — Remove the three `exhaustive-deps` suppressions

**Labels:** `refactor` · **[static]**

Three `// eslint-disable-next-line react-hooks/exhaustive-deps` comments each mask a real
stale-closure bug: the revalidation effect (**R4**), the highlight effect (**B6**, **B7**), and the
input handler's reads of `selectedIndex`/`checkedKeys` (**B12**, **B3**).

Track them as a set so the suppressions come out with the fixes rather than being re-added. Depends
on the `eslint-plugin-react-hooks` upgrade in **T5** to be meaningfully enforced.

**Acceptance criteria**
- [ ] Zero `exhaustive-deps` suppressions in `src/`
- [ ] Lint enforces this going forward

---

### R6 — Use the `itemKey` helper consistently

**Labels:** `refactor` · **[static]**

A module-private `itemKey()` helper exists, but the render inlines `item.key ?? String(item.value)`
twice — once for `isChecked` lookup and once for the React `key`. Three copies of the identity rule
that must agree, or checked state silently detaches from the rendered row.

**Acceptance criteria**
- [ ] All key derivation goes through `itemKey`
- [ ] No behaviour change

---

### R7 — Add explicit early returns after navigation

**Labels:** `refactor` · **[static]**

The navigation block calls `updateSelection` and then **falls through** to the Enter, search-capture,
and hotkey branches. Today that's mostly masked because Ink sets `input = ''` for arrows — which is
exactly why **B14** (`hotkey: ''` firing on ArrowDown) is reachable. One handled key should mean one
action.

Naturally subsumed by **R1** if that lands first.

**Acceptance criteria**
- [ ] A handled navigation key cannot also trigger select/hotkey/search in the same event
- [ ] No behaviour change beyond the **B14** fix

---

### R8 — Collapse the duplicated orientation branches

**Labels:** `refactor` · **[static]**

The vertical and horizontal navigation blocks are the same four branches twice over, differing only
in which `key.*Arrow` and which vim letter they read. Reduce to a single
`{ prev, next }` pair resolved from `orientation`, so a navigation change is made once instead of
four times.

**Acceptance criteria**
- [ ] One navigation code path parameterized by orientation
- [ ] No behaviour change

---

### R9 — Reconsider the exported type names

**Labels:** `refactor` `documentation` · **[static]**

`Properties<V>` is an extremely generic name for a public export and collides conceptually with
anything else a consumer imports. `IndicatorProperties` / `ItemProperties` / `GroupHeaderProperties`
also don't match what the README documents (**B25**) or the React-ecosystem `*Props` convention.

Consider `EnhancedSelectInputProps` as the primary name with `*Props` aliases, keeping the current
names as deprecated aliases for one minor version. Also: `IndicatorProperties.item` is unused behind
a `react/no-unused-prop-types` suppression — dead public API surface to either wire up or drop.

**Acceptance criteria**
- [ ] Ergonomic primary names exported, old names aliased and deprecated
- [ ] README matches the exports
- [ ] `IndicatorProperties.item` used or removed

---

## Features

Each is independently shippable. Where one is materially easier after a bug fix or another feature,
that's noted — but none are hard-blocked.

### F1 — Controlled mode

**Labels:** `enhancement`

Add `selectedIndex` + `onIndexChange`, and `selectedKeys` + `onSelectedKeysChange` for multi-select,
alongside the existing uncontrolled props. Resolves the **B20** limitation and makes "select all",
"reset", and persisted selections possible. The standard shape for a component like this.

### F2 — Custom filter, fuzzy matching, match highlighting

**Labels:** `enhancement`

Filtering is hard-coded to `label.toLowerCase().includes(query.toLowerCase())`. Add
`filter?: (item, query) => boolean`, optional fuzzy/subsequence matching behind `matchMode`, searching
additional fields, and highlighting the matched substring in the rendered label.

### F3 — Search field ergonomics

**Labels:** `enhancement`

Real text-input behaviour in the search line: movable cursor (←/→, Home/End, Ctrl+A/E), word delete
(Ctrl+W), clear line (Ctrl+U), visible cursor glyph. Also resolves **B15**.

### F4 — `onSearchChange`, controlled `searchQuery`, async search

**Labels:** `enhancement`

Expose the query so the parent can drive remote filtering; add `isLoading` with a spinner row and
optional debounce. Turns this into a live-search picker (package search, branch picker, API lookup).
Interacts with **B18** — decide whether checked keys survive result churn.

### F5 — Select by value/key instead of index

**Labels:** `enhancement`

`initialIndex` forces consumers to compute positions. Add `initialValue` / `initialKey` and
`autoSelectFirstEnabled`. Removes a class of off-by-one bugs when items are sorted or filtered
upstream.

### F6 — `PageUp`/`PageDown` and configurable wrap-around

**Labels:** `enhancement`

Add `keyMap.pageKeys` for PageUp/PageDown (Ink already surfaces `key.pageUp`/`key.pageDown`), plus
`loop?: boolean` (default `true`) so navigation can clamp instead of wrapping — wrap-around is
disorienting in long lists.

### F7 — Multi-select quality of life

**Labels:** `enhancement`

Select-all / none / invert via `keyMap`; `minSelections` / `maxSelections` with `onConfirm` blocked
while invalid; a rendered `n selected` count; `checkedIndicator` customisation. Cleanest after **B2**
and **F1**.

### F8 — Label truncation and width control

**Labels:** `enhancement`

`maxWidth` and `truncate: 'end' | 'middle' | 'start'` so long labels ellipsize instead of wrapping.
Resolves **B19** and makes `limit` trustworthy as a height budget. Middle-truncation matters for file
paths.

### F9 — Description lines and separator items

**Labels:** `enhancement`

`item.description` / `item.hint` rendered dimmed beside or beneath the label (the command-palette
look), plus `{ type: 'separator' }` for visual rules without a group header, and
`item.disabledReason` to explain why a row is unselectable.

### F10 — Group improvements

**Labels:** `enhancement`

Sticky header when a group is scrolled mid-window, `collapsible` groups, explicit `groups` ordering, a
"continued" affordance when a group spans a page boundary, and group-level select-all. Best after
**B9** and **B10** fix the foundations.

### F11 — Auto-generated help / footer hint line

**Labels:** `enhancement`

`showHelp` (or `footer`) rendering the active keybindings — `↑↓ navigate · space toggle · enter
confirm · esc cancel` — derived from `keyMap`, `multiple`, and `searchable` so it can't drift from
actual behaviour. Big discoverability win, since vim keys and hotkeys are otherwise invisible.

### F12 — Theming and `NO_COLOR`

**Labels:** `enhancement`

A `theme` prop for the colours currently hard-coded in the default components (`green`, `gray`), plus
honouring [`NO_COLOR`](https://no-color.org/). Today restyling means replacing all three render
components.

### F13 — Headless hook ergonomics

**Labels:** `enhancement`

Return `selectedItem`, `filteredItems`, and `windowIndex` (window-relative — removing the
`i + rotateIndex` arithmetic the README currently gets wrong, **B25**), plus imperative setters
(`setSelectedIndex`, `setSearchQuery`, `toggle`) for custom keybindings. Consider a `./headless`
subpath export.

### F14 — Docs and runnable examples

**Labels:** `documentation`

An `examples/` directory with one runnable file per feature — currently the only executable demo is
the storybook, which needs a full build. Plus a docs site with recorded terminal casts
(asciinema/VHS), a v1 keyboard-behaviour migration note, and recipes (wizard flows, remote search,
nested menus). Note **T7**: `.gitignore` currently ignores `docs`.

### F15 — Type-ahead jump in non-searchable mode

**Labels:** `enhancement`

Standard listbox behaviour: typing `d`,`e` jumps to the first item starting with "de" without
entering filter mode, with an idle timeout resetting the buffer. Complements `searchable` rather than
replacing it. Needs care against the hotkey system (**B23**).

### F16 — Ink focus-manager integration

**Labels:** `enhancement`

`isFocused` is a manual boolean. Offer opt-in integration with Ink's `useFocus`/`focusManager` (e.g.
`autoFocus`, `focusId`) so several selects on one screen can Tab between each other without the
parent hand-rolling focus state.

### F17 — Nested / submenu (tree) support

**Labels:** `enhancement`

`item.children` for drill-down menus, →/Enter to descend, ←/Escape to ascend, breadcrumb display. The
storybook already hand-rolls this with `useState` views, which is evidence it belongs in the library.
Large — likely a 2.0 candidate.

### F18 — Large-list performance

**Labels:** `enhancement` `performance`

Add a 10k-item benchmark. Per-render work is currently O(n) several times over (filter, group scan,
duplicate-key scan) — see **R3** and **R4**. Confirm the `limit` window keeps render cost bounded.

---

## Test debt

Two existing tests assert buggy behaviour and must be **rewritten** with their fix, not treated as
regressions:

| Test | Issue |
| --- | --- |
| `searchable + multiple: can filter then confirm checked items` | **B2** — asserts one confirmed item after filtering, locking in the data loss |
| `non-contiguous items with same group get separate headers per window` | **B10** — name says "separate headers", assertion checks for exactly one |

One more is worth a note rather than a change: `searchable: selection resets to first item when query
changes` passes legitimately (it moves the cursor to index 1 first, so the index genuinely changes),
but it reads as though highlight-tracking under filtering were covered — which is what let **B7**
through. Add the index-stays-at-0 case beside it.

---

## Suggested sequencing

Not a dependency graph — every issue above stands alone. This is just the cheapest order, grouping
work that touches the same code.

| Order | Issues | Why |
| --- | --- | --- |
| 1 | **T1**, **T3** | Packaging hotfix, zero behaviour risk, ship as `1.1.2` |
| 2 | **T5** (`eslint-plugin-react-hooks` only) | Lands the linter that catches the next batch |
| 3 | **R1**, **R7**, **R8** → then **B1**, **B5**, **B14**, **B16**, **B24** | Refactor the input handler first, then the guards become one-line changes |
| 4 | **R4**, **R5** → then **B6**, **B7**, **B8**, **B17** | Effect/callback cluster; needs the StrictMode pass from **T6** |
| 5 | **R2** → then **B11**, **B12** | Deriving the window offset makes both fixes small |
| 6 | **B2**, **B3**, **B4**, **B18**, **B20**, **B21** + **F1**, **F7** | Multi-select correctness, then controlled mode |
| 7 | **B9**, **B10**, **B13**, **B19**, **B22** + **F8** | Rendering and layout cluster |
| 8 | **B25**, **R9**, **F13**, **F14** | Docs and public-API naming together |
| — | **T4**, **T6**, **T7**, rest of **T5**, **R3**, **R6** | Small independent PRs, any time |
| — | **T2**, **F5**, **F6**, **F16**, **F17**, **F18** | Ink 7 and API additions worth grouping into a major |
