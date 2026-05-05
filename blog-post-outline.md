# Blog Post Outline: ink-enhanced-select-input 1.0.0

## Working Title

"ink-enhanced-select-input hits 1.0 — a full-featured select component for terminal UIs"

## Target Audience

Developers building CLI tools with Ink/React who need richer selection UIs than the default `ink-select-input` provides.

---

## Outline

### 1. Intro / Hook

- What the library is: an enhanced select input for Ink (React for CLIs)
- Why 1.0 now: the API is stable, battle-tested with 133 tests, and covers the use cases people actually need for production CLI tools
- Brief mention of the journey from 0.2.0 (basic component) to 1.0.0 (full-featured toolkit)

### 2. What's New Since the Early Releases (the 1.0 feature set)

#### Headless Hook: `useEnhancedSelectInput`

- Extracted all behavior into a headless hook
- Consumers can build fully custom renderers while keeping navigation, pagination, hotkeys, and callbacks
- Returns `selectedIndex`, `visibleItems`, `itemsAbove`, `itemsBelow`, `checkedKeys`, `searchQuery`
- The component itself is now a thin rendering wrapper

#### Multi-Select Mode

- `multiple` prop enables checkbox-style selection
- Space toggles, Enter confirms
- `defaultSelectedKeys` for pre-populated state
- `onToggle` and `onConfirm` callbacks
- Hotkeys disabled in multi-select to avoid Space ambiguity

#### Searchable / Filterable Mode

- `searchable` prop enables inline type-to-filter
- Case-insensitive substring matching on labels
- Renders a `/ query` input line above the list
- Backspace to edit, Escape to clear (then cancel)
- Vim keys become search characters (no conflict)
- "No matches" empty state
- Works with groups, limit/pagination, and disabled items

#### Item Groups with Section Headers

- `group` field on items
- Visual headers rendered before each group's first item
- Non-navigable (purely visual)
- Custom `groupHeaderComponent` prop
- Works with pagination/limit

#### Scroll Indicators

- `showScrollIndicators` prop
- Shows `▲ N more` / `▼ N more` (or ◀/▶ in horizontal)
- Only appears when items are clipped by `limit`

#### Escape / Cancel Support

- `onCancel` prop fires on Escape
- In searchable mode: Escape clears query first, then fires onCancel
- Enables multi-step CLI "go back" flows without parent `useInput` hacks

#### Home / End Keys

- Jump to first/last enabled item
- Respects disabled items at boundaries
- Updates pagination window

### 3. Quality & Reliability

- 133 tests covering every feature, edge case, and interaction
- Strict TypeScript with generics (`Item<V>`)
- Dev-only duplicate key warnings for object-valued items
- Items prop sync: selection re-validates when items change after mount
- Proper disabled item handling throughout (navigation, selection, hotkeys, Home/End)
- Bug found and fixed during 1.0 prep: backspace in searchable mode now handles both `key.backspace` (BS, \x08) and `key.delete` (DEL, \x7f) — terminals vary in which they send

### 4. Architecture Decisions Worth Noting

- Single file, co-located types — no separate type files
- Hook + component split means you can use just the behavior or the full UI
- ESM-only, Node 20+, React 19, Ink 6
- No external dependencies beyond ink and react
- Modern `exports` field in package.json for proper ESM resolution
- Clean public API: only named exports (no default export ambiguity)

### 5. Quick Start / Usage Example

- Show a simple example
- Show a more complex example combining searchable + groups + limit

### 6. What's Next / Call to Action

- Link to GitHub repo
- Link to npm
- Mention it's MIT licensed
- Invite contributions / feedback

---

## Key Stats to Mention

- **133 tests** (up from ~10 in 0.2.0)
- **0 runtime dependencies** beyond ink + react
- **Generic value type** support (`Item<V>`)
- **Headless hook** for custom renderers
- **6 interaction modes**: single-select, multi-select, searchable, grouped, paginated, horizontal

## Features Changelog (0.2.0 → 1.0.0)

| Version | Key Addition                                                          |
| ------- | --------------------------------------------------------------------- |
| 0.3.0   | Ink 6 / React 19 / Node 20 upgrade                                    |
| 0.4.0   | Fixed initialIndex disabled skip, limit pagination, CI                |
| 0.5.0   | Headless hook, scroll indicators, onCancel/Escape, Home/End           |
| 0.6.0   | Multi-select mode, duplicate key warnings                             |
| 1.0.0   | Item groups, searchable mode, comprehensive test coverage, API polish |

## Interesting Anecdote for the Post

During the 1.0 prep audit, we discovered that the backspace handler in searchable mode only checked `key.backspace` — but most terminals send `\x7f` (DEL) for the backspace key, which Ink maps to `key.delete`. The fix was a one-line change (`key.backspace || key.delete`), but it was only caught because we wrote edge-case tests that exercised backspace in scenarios where the filter narrows results. Good reminder that thorough testing catches real bugs, not just theoretical ones.

## Repo & Links

- GitHub: https://github.com/gfargo/ink-enhanced-select-input
- npm: https://www.npmjs.com/package/ink-enhanced-select-input
- Ink: https://github.com/vadimdemedes/ink
