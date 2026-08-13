# Ink Enhanced Select Input

[![npm version](https://img.shields.io/npm/v/ink-enhanced-select-input.svg)](https://www.npmjs.com/package/ink-enhanced-select-input)
[![npm downloads](https://img.shields.io/npm/dm/ink-enhanced-select-input.svg)](https://www.npmjs.com/package/ink-enhanced-select-input)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/ink-enhanced-select-input.svg)](https://bundlephobia.com/result?p=ink-enhanced-select-input)
[![GitHub issues](https://img.shields.io/github/issues/gfargo/ink-enhanced-select-input.svg)](https://github.com/gfargo/ink-enhanced-select-input/issues)
[![license](https://img.shields.io/github/license/gfargo/ink-enhanced-select-input.svg)](./LICENSE)

An enhanced, customizable select input component for [Ink](https://github.com/vadimdemedes/ink) that supports both vertical and horizontal orientations, hotkeys, and flexible rendering. Ideal for building rich, interactive CLI apps with React.

## Features

- **Orientation:** Choose between vertical or horizontal layouts.
- **Custom Indicators & Items:** Easily swap out the default indicator and item rendering.
- **Hotkey Support:** Assign single-character hotkeys for quick selection.
- **Disabled Items:** Gracefully skip unselectable items during navigation.
- **Keyboard Navigation:** Arrow keys, Vim-like keys (`h/j/k/l`), Home/End, Page Up/Down supported.
- **Configurable Wrap-Around:** `loop` (default `true`) controls whether navigation wraps at the list boundary or clamps.
- **Hooks for Highlight & Selection:** Run custom logic on highlight and selection changes.
- **Limit Displayed Items:** Restrict how many options to show at once, with optional scroll indicators.
- **Multi-select Mode:** Space to toggle, Enter to confirm a multi-item selection.
- **Searchable Mode:** Type to filter items inline with case-insensitive matching, opt-in fuzzy matching, custom filter predicates, and matched-character highlighting.
- **Type-ahead Jump:** Opt-in listbox-style jump to the first item matching typed characters, without entering search mode.
- **Item Groups:** Organize items under non-navigable section headers.
- **Descriptions, Hints & Separators:** Command-palette-style dimmed description/hint text, `disabledReason` explanations, and non-navigable separator rows.
- **Cancel / Escape:** `onCancel` prop for multi-step CLI "go back" flows.
- **Headless Hook:** `useEnhancedSelectInput` for fully custom renderers with built-in behavior.
- **Nested Items:** `children` on an `Item` lets Enter/→ drill into a submenu and Escape/← back out, with cursor memory and a built-in breadcrumb rendered above the list — vertical, single-select only.
- **Theming:** Override the default component colors with a `theme` prop; automatically disabled when [`NO_COLOR`](https://no-color.org/) is set.

## Compatibility

| Dependency | Ink 6 | Ink 7   |
| ---------- | ----- | ------- |
| Node.js    | >= 20 | >= 22   |
| React      | >= 19 | >= 19.2 |

> For Ink 5 / React 18 support, use `ink-enhanced-select-input@0.2.0`.

## Installation

```bash
npm install ink-enhanced-select-input ink react
```

or

```bash
yarn add ink-enhanced-select-input ink react
```

## Usage

```tsx
import React from 'react'
import { render, Text } from 'ink'
import { EnhancedSelectInput } from 'ink-enhanced-select-input'

const items = [
  { label: 'Option 1', value: 'one', hotkey: '1' },
  { label: 'Option 2', value: 'two', hotkey: '2' },
  { label: 'Option 3', value: 'three', disabled: true },
  { label: 'Option 4', value: 'four', hotkey: '4' },
]

function Demo() {
  return (
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => console.log(`Selected: ${item.value}`)}
      onHighlight={(item) => console.log(`Highlighted: ${item.value}`)}
    />
  )
}

render(<Demo />)
```

### Horizontal Layout

```tsx
<EnhancedSelectInput
  items={items}
  orientation="horizontal"
  onSelect={(item) => console.log(item.value)}
/>
```

### Multi-select

Enable multi-select mode with the `multiple` prop. Space toggles an item; Enter confirms the full selection.

> **Note:** A per-item `indicator` (see [Per-Item Indicators](#per-item-indicators)) is ignored when `multiple` is `true` — the built-in checkbox indicator always takes precedence, and a dev warning is logged if both are supplied. To customize how indicators look in multi-select mode, pass `indicatorComponent` instead.

> **`defaultSelectedKeys` is mount-only.** Like any `default*` prop, it seeds the initial checked set once and is not read again — passing a new array on a later render does not change the current selection. There is no controlled `selectedKeys` prop (yet); to force a fresh selection (e.g. "select all", "restore saved selection", "reset"), remount the component with a new `key`:
>
> ```tsx
> <EnhancedSelectInput
>   key={selectionResetToken} // bump this to force a remount with new defaults
>   items={options}
>   multiple
>   defaultSelectedKeys={savedSelection}
> />
> ```

```tsx
import React, { useState } from 'react'
import { render, Text } from 'ink'
import { EnhancedSelectInput } from 'ink-enhanced-select-input'

const options = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'React', value: 'react' },
  { label: 'Ink', value: 'ink' },
  { label: 'Legacy (unsupported)', value: 'legacy', disabled: true },
]

function MultiDemo() {
  return (
    <EnhancedSelectInput
      items={options}
      multiple
      defaultSelectedKeys={['ts']}
      onToggle={(item, checked) =>
        console.log(`${item.label} is now ${checked ? 'checked' : 'unchecked'}`)
      }
      onConfirm={(selected) =>
        console.log(
          'Confirmed:',
          selected.map((i) => i.value)
        )
      }
    />
  )
}

render(<MultiDemo />)
```

#### Bulk selection & selection constraints

In `multiple` mode, `Ctrl+A` checks every enabled item, `Ctrl+D` clears the selection, and `Ctrl+R` inverts it (gated by `keyMap.bulk`, default `true`). The same operations are available headlessly via `selectAll()`, `selectNone()`, and `invertSelection()` from `useEnhancedSelectInput`.

`minSelections` / `maxSelections` constrain how many items may be checked: `toggle` (and the bulk actions) refuse to check beyond `maxSelections`, and `onConfirm` only fires on Enter when the checked count is within `[minSelections, maxSelections]` — otherwise Enter is a no-op. Pair this with `showSelectionCount` to render an always-visible "N selected" line (with a `/min` or `/max` hint) so the constraint is visible to the user:

```tsx
<EnhancedSelectInput
  items={options}
  multiple
  minSelections={1}
  maxSelections={2}
  showSelectionCount
  onConfirm={(selected) => console.log('Confirmed:', selected)}
/>
```

Customize the checkbox glyphs with `checkedIndicator` / `uncheckedIndicator` (defaults `'[x]'` / `'[ ]'`):

```tsx
<EnhancedSelectInput
  items={options}
  multiple
  checkedIndicator="✔"
  uncheckedIndicator="✗"
/>
```

### Controlled Mode

By default the highlighted index and (in multi-select) the checked keys are managed internally — `initialIndex` and `defaultSelectedKeys` just seed that internal state. To drive them from outside the component (e.g. for "select all", "reset", or persisting a selection across renders), pass `selectedIndex`/`onIndexChange` and `selectedKeys`/`onSelectedKeysChange` instead. Once a controlled prop is set, keypresses call its `on*Change` callback instead of moving the internal state — the highlight or checkboxes only update once the parent feeds the new value back in.

```tsx
import React, { useState } from 'react'
import { render } from 'ink'
import { EnhancedSelectInput } from 'ink-enhanced-select-input'

const options = [
  { label: 'TypeScript', value: 'ts', key: 'ts' },
  { label: 'React', value: 'react', key: 'react' },
  { label: 'Ink', value: 'ink', key: 'ink' },
]

function ControlledDemo() {
  const [index, setIndex] = useState(0)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  return (
    <EnhancedSelectInput
      multiple
      items={options}
      selectedIndex={index}
      onIndexChange={setIndex}
      selectedKeys={selectedKeys}
      onSelectedKeysChange={setSelectedKeys}
      onConfirm={(selected) => console.log(selected.map((i) => i.value))}
    />
  )
}

render(<ControlledDemo />)
```

Don't pass `initialIndex` alongside `selectedIndex`, or `defaultSelectedKeys` alongside `selectedKeys` — the uncontrolled prop is ignored once its controlled counterpart is set, and a dev warning is logged if both are supplied. A dev warning is also logged if `selectedIndex`/`selectedKeys` is supplied without its `on*Change` handler, since that freezes the highlight/checkboxes entirely.

If a controlled `selectedIndex`/`selectedKeys` value resolves to something different than what was passed in — e.g. `items` shrinks and the index falls out of range, or a checked key's item becomes `disabled` or is removed from `items` entirely — the resolved value is fed straight back through `onIndexChange`/`onSelectedKeysChange` so the parent's state never silently diverges from what's rendered.

**Checked keys are pruned when `items` changes.** In both controlled and uncontrolled multi-select, a key in `checkedKeys`/`selectedKeys` is dropped as soon as `items` no longer contains an item with that key — e.g. a page of remote search results replacing `items` without the previously-checked entry. This is deliberate: without it, a stale key would silently pre-check a _different_ item that later happens to reuse the same key. If you're driving `items` from paginated/remote data and want checked items to persist across pages, keep every checked item present in `items` (merge new results into the existing array rather than replacing it) instead of relying on the checked state to survive its item's absence.

The search query follows the same contract: pass `searchQuery`/`onSearchChange` to drive it from outside the component — see [Live/Async Search](#liveasync-search) for the full picture, including why controlling the query also disables built-in filtering.

### Per-Item Indicators

```tsx
<EnhancedSelectInput
  items={[
    { label: 'Save', value: 'save', indicator: <Text color="green">✔</Text> },
    { label: 'Delete', value: 'delete', indicator: <Text color="red">✘</Text> },
    { label: 'Cancel', value: 'cancel', hotkey: 'c' },
  ]}
  onSelect={(item) => console.log(item.value)}
/>
```

`item.indicator` only applies in single-select mode — see the [Multi-select](#multi-select) note above for the multi-select behaviour.

### Pagination (`limit`)

Set `limit` to cap how many rows are visible at once. By default (`paginationMode: 'page'`), the viewport snaps to fixed page boundaries — moving past the last visible row jumps the whole window to the next page.

Set `paginationMode="scroll"` for a cursor-following viewport instead: the window advances one row at a time as the cursor reaches its edge, keeping the highlight where the eye already is — matching `ink-select-input`, `fzf`, and `gum`.

```tsx
<EnhancedSelectInput items={items} limit={5} paginationMode="scroll" />
```

Use `scrollOffset` (only meaningful in `'scroll'` mode) to keep a margin of context rows above/below the cursor before the window scrolls:

```tsx
<EnhancedSelectInput
  items={items}
  limit={5}
  paginationMode="scroll"
  scrollOffset={2}
/>
```

`scrollOffset` is clamped internally to `floor((limit - 1) / 2)` — larger values would leave no stable cursor range between the "scroll up" and "scroll down" margins, so the window would jitter instead of scrolling one row at a time.

Home/End always land on a sane window — Home scrolls to the start of the list, End scrolls so the last item is on the bottom row.

`'scroll'` mode windows are sized by item count. `'page'` mode charges group headers against `limit` too (see [Grouped Items](#grouped-items)) so its rendered height never exceeds `limit`; in `'scroll'` mode a window can render up to `limit` items **plus** any group headers in view, so the visible row count may exceed `limit` when `group` is used together with `paginationMode="scroll"`.

### Grouped Items

Group items under section headers by setting the `group` field. Items sharing the same `group` value are visually grouped, and a header row is rendered before the first item in each group. Headers are purely visual — they are non-navigable and do not affect selection.

```tsx
<EnhancedSelectInput
  items={[
    { label: 'Option A', value: 'a', group: 'Recent' },
    { label: 'Option B', value: 'b', group: 'Recent' },
    { label: 'Option C', value: 'c', group: 'All' },
    { label: 'Option D', value: 'd', group: 'All' },
  ]}
  onSelect={(item) => console.log(item.value)}
/>
```

Renders:

```
── Recent ──
> Option A
  Option B
── All ──
  Option C
  Option D
```

When `limit` is set, group headers count toward it just like items — a header takes up one row, and the first item of a page always renders its header (even mid-group), since it has no preceding visible item to compare against. This keeps the rendered line count predictable and bounded by `limit`, regardless of how items are grouped. Each page is guaranteed at least one item, so a group whose header + item alone exceeds `limit` still renders (rather than being skipped).

You can provide a custom header renderer via `groupHeaderComponent`:

```tsx
<EnhancedSelectInput
  items={items}
  groupHeaderComponent={({ label }) => (
    <Text bold color="cyan">
      {label}
    </Text>
  )}
/>
```

### Descriptions, Hints & Disabled Reasons

Give an item a `description` (rendered dimmed on its own line beneath the label) and/or a `hint` (rendered dimmed to the right of the label) for a command-palette look. A `disabledReason` renders dimmed beside the label of a `disabled` item to explain why it can't be selected.

```tsx
<EnhancedSelectInput
  items={[
    {
      label: 'Deploy to production',
      value: 'deploy',
      description: 'Pushes the current branch live. This cannot be undone.',
    },
    { label: 'Open file', value: 'open', hint: 'Ctrl+O' },
    {
      label: 'Premium feature',
      value: 'premium',
      disabled: true,
      disabledReason: 'Upgrade to unlock',
    },
  ]}
  onSelect={(item) => console.log(item.value)}
/>
```

> **Pagination note:** `limit` budgets one visual row per item (see [Grouped Items](#grouped-items) above). A rendered `description` adds an extra line that isn't counted toward that budget, so windows containing descriptions can render taller than `limit` rows.

### Separator Items

Insert a non-navigable visual rule between items with `{ type: 'separator' }` — useful for grouping without a header label. Separators are skipped by all navigation (arrows, vim keys, Home/End, type-ahead, hotkeys) and are never passed to `onSelect`, `onHighlight`, or `onConfirm`.

```tsx
<EnhancedSelectInput
  items={[
    { label: 'Copy', value: 'copy' },
    { label: 'Paste', value: 'paste' },
    { type: 'separator' },
    { label: 'Delete', value: 'delete' },
  ]}
  onSelect={(item) => console.log(item.value)}
/>
```

Provide a custom separator renderer via `separatorComponent`:

```tsx
<EnhancedSelectInput
  items={items}
  separatorComponent={() => <Text dimColor>{'· '.repeat(10)}</Text>}
/>
```

### Searchable Mode

Enable inline filtering with the `searchable` prop. Printable characters build a search query that filters items by label (case-insensitive substring match). A search input line renders above the item list.

```tsx
<EnhancedSelectInput
  items={items}
  searchable
  searchPlaceholder="Filter options..."
  onSelect={(item) => console.log(item.value)}
/>
```

Renders:

```
/ Filter options...
> Option A
  Option B
  Option C
```

When typing:

```
/ app
> Apple
  Pineapple
```

**Key behavior in searchable mode:**

- Printable characters are inserted into the query at the cursor position, shown as an inverse-video block
- `Backspace`/`Delete` both remove the character before the cursor. This is intentional, not a bug: most terminals send the same byte sequence for a physical Backspace press that xterm-style terminals use for forward-Delete, and [Ink can't tell them apart](https://github.com/vadimdemedes/ink/blob/main/src/parse-keypress.ts) — so there's no reliable signal available to give forward-Delete a distinct "remove character after cursor" behavior
- `Escape` clears the query; if already empty, calls `onCancel`
- In vertical orientation (the default), `←`/`→` and `Home`/`End` move the search cursor; `Ctrl+A`/`Ctrl+E` do the same in either orientation
- `Ctrl+W` deletes the word before the cursor; `Ctrl+U` deletes from the start of the query up to the cursor
- In horizontal orientation, `←`/`→` and `Home`/`End` navigate the filtered results instead (use `Ctrl+A`/`Ctrl+E`/`Ctrl+W`/`Ctrl+U` to edit the query)
- Vim keys (`h/j/k/l`) are treated as search characters, not navigation
- Hotkeys are disabled (characters go to the search query)
- "No matches" is shown when the query matches nothing

#### Custom Filtering, Fuzzy Matching & Highlighting

By default, searchable mode matches the query as a case-insensitive substring of `item.label`. Three props let you customize this:

- **`matchMode`** — `'includes'` (default) or `'fuzzy'`. `'fuzzy'` matches an ordered, non-contiguous subsequence — e.g. the query `ae` matches `Apple` and `Grape` but not `Banana`.
- **`searchFields`** — `(item) => string | string[]`, selects which text an item is matched against instead of (or in addition to) `label`. An item matches if any returned field matches.
- **`filter`** — `(item, query) => boolean`, fully overrides the built-in matcher (`matchMode` and `searchFields` are ignored) for total control over what counts as a match.

```tsx
<EnhancedSelectInput
  items={items}
  searchable
  matchMode="fuzzy"
  onSelect={(item) => console.log(item.value)}
/>
```

```tsx
// Search descriptions instead of (or alongside) labels
<EnhancedSelectInput
  items={items}
  searchable
  searchFields={(item) => [item.label, item.value.description]}
/>
```

```tsx
// Fully custom predicate — matchMode/searchFields are ignored
<EnhancedSelectInput
  items={items}
  searchable
  filter={(item, query) => item.value.tags.includes(query)}
/>
```

The default `<ItemComponent>` bolds the matched characters in the label. A custom `itemComponent` receives the same information via the `matches` prop — an array of `[start, end)` character ranges into `label`, computed against the active `matchMode` (ranges are best-effort against `label` even when a custom `filter` matched on a different field, and are `undefined` outside searchable mode or when the query is empty):

```tsx
function MyItem({ label, matches, isSelected }: ItemProps) {
  // matches: ReadonlyArray<readonly [number, number]> | undefined
  return <Text color={isSelected ? 'green' : undefined}>{label}</Text>
}
```

#### Live/Async Search

Pass `onSearchChange` to observe the query as the user types — this is what turns searchable mode into a live-search picker (package search, branch picker, remote API lookup). Combine it with `isLoading` to show a loading row while a request is in flight:

```tsx
function RemoteSearch() {
  const [items, setItems] = useState<Array<Item<string>>>([])
  const [isLoading, setIsLoading] = useState(false)

  return (
    <EnhancedSelectInput
      searchable
      items={items}
      isLoading={isLoading}
      searchDebounce={200}
      onSearchChange={async (query) => {
        setIsLoading(true)
        const results = await searchPackages(query)
        setItems(results.map((r) => ({ label: r.name, value: r.name })))
        setIsLoading(false)
      }}
      onSelect={(item) => console.log(item.value)}
    />
  )
}
```

By default the query is uncontrolled — the query displayed in the search line, and the built-in `matchMode`/`filter`/`searchFields` matching against `items`, both still work exactly as described above; `onSearchChange` is just an extra notification on top. `searchDebounce` (ms) coalesces rapid `onSearchChange` calls so you're not firing a request per keystroke — the displayed query still updates immediately, only the notification is delayed.

For full control over filtering (e.g. the parent already returned a pre-filtered result set from a remote API), pass `searchQuery` to make the query itself controlled — the same contract as `selectedIndex`/`onIndexChange`: search-editing keypresses call `onSearchChange` instead of mutating the query internally, and the parent must feed the value back through `searchQuery` for the displayed query to change. Built-in filtering is also skipped while controlled — `items` is rendered verbatim (match highlighting still works against `label`), since the parent is expected to already have filtered it:

```tsx
function ControlledRemoteSearch() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Array<Item<string>>>([])

  useEffect(() => {
    searchPackages(query).then((results) =>
      setItems(results.map((r) => ({ label: r.name, value: r.name })))
    )
  }, [query])

  return (
    <EnhancedSelectInput
      searchable
      items={items}
      searchQuery={query}
      onSearchChange={setQuery}
    />
  )
}
```

A dev warning is logged if `searchQuery` is supplied without `onSearchChange`, since that freezes the displayed query — the same pattern as the other controlled props.

### Type-ahead Jump

Enable listbox-style type-ahead jump with the `typeahead` prop. It's opt-in and only takes effect when `searchable` is off. Typing printable characters builds a short-lived buffer and jumps the highlight to the first non-disabled item whose label starts with it (case-insensitive) — it moves the highlight only, it never calls `onSelect`/`onConfirm`. The buffer resets after `typeaheadTimeout` ms of inactivity (default `500`).

```tsx
<EnhancedSelectInput
  items={items}
  typeahead
  typeaheadTimeout={500}
  onSelect={(item) => console.log(item.value)}
/>
```

**Key behavior in type-ahead mode:**

- Typing `d` then `e` within the idle window jumps to the first item starting with `de`
- Typing again after the idle window resets the buffer to a single new character
- Vim keys (`h/j/k/l`) are excluded from the buffer and keep navigating
- If the buffer is idle/empty and the typed character matches an enabled item's `hotkey`, the hotkey fires as usual; once a buffer is active, further characters append to it instead of firing hotkeys
- A character with no matching item leaves the current selection unchanged
- Ignored entirely when `searchable` is `true` — printable characters remain search input in that mode
- In single-select mode, `Space` is treated as a buffer character (the multi-select toggle path doesn't apply), so a leading space only matches labels that begin with a space

### Truncating Long Labels

Set `maxWidth` to ellipsize labels that would otherwise wrap to multiple rows, keeping `limit` a trustworthy height budget — one row per item. `truncate` controls where the ellipsis lands: `'end'` (default), `'start'`, or `'middle'` (handy for file paths, since it keeps both the leading directory and the filename visible).

```tsx
<EnhancedSelectInput
  items={[{ label: '/very/long/path/to/some/deeply/nested/file.ts', value: 1 }]}
  maxWidth={30}
  truncate="middle"
/>
```

Truncation is display-only: search filtering, `onSelect`/`onHighlight`/`onConfirm`, and hotkeys all operate on the item's original, untruncated `label`. A custom `itemComponent` receives the already-truncated string via its `label` prop.

### Avoiding Key Conflicts (`keyMap`)

Because Ink does not support event propagation stopping, every `useInput` handler in your app receives every keypress simultaneously. If your application already binds one of the component's default keys globally, you can disable individual key groups with the `keyMap` prop — the component ignores those keys without interfering with your own handlers.

```tsx
// j/k are used by a parent vim-style navigator — disable them here
<EnhancedSelectInput
  items={items}
  keyMap={{ vimKeys: false }}
  onSelect={onSelect}
/>

// Parent handles Escape itself — don't fire onCancel
<EnhancedSelectInput
  items={items}
  keyMap={{ cancel: false }}
  onSelect={onSelect}
/>

// Arrows-only navigation — disable vim keys, Home/End, and Space toggle
<EnhancedSelectInput
  items={items}
  multiple
  keyMap={{ vimKeys: false, homeEnd: false, toggle: false }}
  onConfirm={onConfirm}
/>

// Item hotkeys conflict with a parent-level 'q' binding — disable hotkeys only,
// Enter still works
<EnhancedSelectInput
  items={items}
  keyMap={{ hotkeys: false }}
  onSelect={onSelect}
/>
```

| `keyMap` field | Keys it controls                                                              | Default |
| -------------- | ----------------------------------------------------------------------------- | ------- |
| `arrows`       | `↑` `↓` `←` `→`; also `→`-descend / `←`-ascend for `item.children`            | `true`  |
| `vimKeys`      | `j` `k` (vertical) · `h` `l` (horizontal)                                     | `true`  |
| `homeEnd`      | `Home` · `End`                                                                | `true`  |
| `pageKeys`     | `Page Up` · `Page Down`                                                       | `true`  |
| `cancel`       | `Escape` → `onCancel`; also `Escape`-ascend out of `item.children`            | `true`  |
| `select`       | `Enter` → `onSelect` / `onConfirm`; also `Enter`-descend into `item.children` | `true`  |
| `toggle`       | `Space` toggle in multi-select mode                                           | `true`  |
| `bulk`         | `Ctrl+A`/`Ctrl+D`/`Ctrl+R` bulk select-all/none/invert (multi-select mode)    | `true`  |
| `hotkeys`      | Item `hotkey` chars (independent of `select`)                                 | `true`  |
| `search`       | Printable-character capture in searchable mode                                | `true`  |

Any field not supplied stays enabled. `isFocused={false}` remains the way to disable all input at once.

`hotkeys` and `select` are independent: `keyMap={{ hotkeys: false }}` disables item hotkeys but leaves `Enter` working, and `keyMap={{ select: false }}` disables `Enter` but leaves item hotkeys working.

### Custom Components

```tsx
function MyIndicator({ isSelected }) {
  return (
    <Text color={isSelected ? 'magenta' : undefined}>
      {isSelected ? '👉' : '  '}
    </Text>
  )
}

function MyItem({
  isSelected,
  isDisabled,
  label,
  description,
  hint,
  disabledReason,
}) {
  return (
    <Text
      color={isDisabled ? 'gray' : isSelected ? 'yellow' : 'white'}
      dimColor={isDisabled}
    >
      {label}
      {hint ? ` ${hint}` : ''}
      {isDisabled && disabledReason ? ` — ${disabledReason}` : ''}
      {description ? ` (${description})` : ''}
    </Text>
  )
}

;<EnhancedSelectInput
  items={items}
  indicatorComponent={MyIndicator}
  itemComponent={MyItem}
/>
```

`ItemProps` includes `description`, `hint`, and `disabledReason` so a custom `itemComponent` can render them however it likes. The built-in `DefaultItemComponent` is the only renderer the library draws these for automatically — once you supply your own `itemComponent`, you own rendering that text; the library won't render it a second time.

`IndicatorProps` includes the full `item` being rendered, so a custom `indicatorComponent` can key its output off item data (e.g. `item.value`) instead of just `isSelected`/`isChecked`. The built-in `DefaultIndicatorComponent` doesn't read it.

`DefaultItemComponent` and `DefaultGroupHeaderComponent` both render with `wrap="truncate-end"` so an overlong label or group name (e.g. a long file path or branch name) ellipsizes onto a single row instead of wrapping, keeping `limit` a reliable row budget. A custom `itemComponent` or `groupHeaderComponent` renders its own `<Text>` and must set its own `wrap` if it needs the same guarantee — an unbounded default `wrap="wrap"` can still push a page past `limit` rows on a narrow terminal.

### Theming

If you only need to change colors — not swap out entire components — pass a `theme` prop instead of writing custom `indicatorComponent`/`itemComponent`/`groupHeaderComponent`. Any slot you don't set keeps its default value:

```tsx
<EnhancedSelectInput
  items={items}
  theme={{
    selected: 'magenta', // cursor + highlighted label. Default: 'green'
    disabled: 'red', // disabled item labels. Default: 'gray'
    hotkey: 'cyan', // trailing "(a)" hotkey hint. Default: 'gray'
    groupHeader: 'blue', // group header text. Default: undefined (dim only)
    scrollIndicator: 'yellow', // ▲/▼/◀/▶ indicators. Default: undefined (dim only)
    searchPlaceholder: 'white', // search query/placeholder text. Default: undefined (dim only)
  }}
/>
```

Custom `indicatorComponent`, `itemComponent`, `groupHeaderComponent`, and `breadcrumbComponent` also receive the resolved theme as a `theme` prop, so they can opt into it instead of hard-coding colors.

The component automatically disables all color (and dim styling) when the [`NO_COLOR`](https://no-color.org/) environment variable is set to a non-empty value — no configuration needed.

### Headless Hook

If you need a fully custom renderer while keeping the built-in navigation, hotkeys, pagination, and callbacks, import `useEnhancedSelectInput` directly — either from the main package or from the dedicated `ink-enhanced-select-input/headless` subpath (no component/render code included):

```tsx
import { useEnhancedSelectInput } from 'ink-enhanced-select-input/headless'

function MyCustomSelect({ items, onSelect }) {
  const { visibleItems, windowIndex, itemsAbove, itemsBelow } =
    useEnhancedSelectInput({ items, onSelect })

  return (
    <Box flexDirection="column">
      {itemsAbove > 0 && <Text dimColor>↑ {itemsAbove} more</Text>}
      {visibleItems.map((item, i) => (
        <Text
          key={item.key ?? String(item.value)}
          color={i === windowIndex ? 'cyan' : undefined}
        >
          {item.label}
        </Text>
      ))}
      {itemsBelow > 0 && <Text dimColor>↓ {itemsBelow} more</Text>}
    </Box>
  )
}
```

`windowIndex` is the highlighted item's index **within `visibleItems`** (i.e. `selectedIndex - rotateIndex`) — use it, not `selectedIndex`, when indexing into `visibleItems`.

The hook accepts all the same props as `EnhancedSelectInput` except `indicatorComponent`, `itemComponent`, `groupHeaderComponent`, `showScrollIndicators`, `searchPlaceholder`, `maxWidth`, `truncate`, and `theme` (theming is render-only) — including `selectedIndex`/`onIndexChange` and `selectedKeys`/`onSelectedKeysChange` for [controlled mode](#controlled-mode). It returns:

- `selectedIndex` — index of the highlighted item within `filteredItems`. Reflects the `selectedIndex` prop when controlled.
- `rotateIndex` — start of the current pagination window (`0` when `limit` is not set).
- `windowIndex` — index of the highlighted item within `visibleItems` (`selectedIndex - rotateIndex`; `-1` when there are no items).
- `visibleItems` — the slice of items visible in the current window.
- `filteredItems` — all items after search filtering, before pagination.
- `selectedItem` — the currently highlighted item, or `undefined` when there are no items.
- `hasItems` — `true` when `filteredItems` is non-empty.
- `itemsAbove` / `itemsBelow` — counts of items hidden above/below the current window.
- `checkedKeys` — a `Set<string>` of checked item keys, only populated when `multiple` is `true`. Reflects the `selectedKeys` prop when controlled.
- `searchQuery` — the current filter string, empty when `searchable` is `false`.
- `searchCursor` — cursor position within `searchQuery` (`[0, searchQuery.length]`); always `0` when `searchable` is `false`.
- `setSelectedIndex(index)` — imperatively move the highlighted item, clamping into range and snapping `rotateIndex` to the containing page.
- `setSearchQuery(query)` — imperatively set the search query, place the cursor at the end, and reset the highlighted selection to the top. Has no filtering effect unless `searchable` is `true`.
- `toggle(item?)` — toggle the checked state of `item` (defaults to the highlighted item) in `multiple` mode; no-op outside `multiple` mode, on a disabled item, or when checking would exceed `maxSelections` (unchecking is always allowed), and fires `onToggle`.
- `selectAll()` / `selectNone()` / `invertSelection()` — bulk-check/uncheck/flip every enabled item (respecting the active search filter and `maxSelections`); no-op outside `multiple` mode.
- `selectionCount` — number of currently checked items (`0` outside `multiple` mode).
- `isSelectionValid` — `true` when `selectionCount` satisfies `minSelections`/`maxSelections` (always `true` outside `multiple` mode or when neither bound is set).

These setters give you the hooks needed to wire up custom keybindings on top of the built-in behaviour.

### Nested Items

Give an item a non-empty `children` array to make it a submenu. Enter or `→` on a highlighted item with `children` descends into that list instead of firing `onSelect`; Escape or `←` ascends back to the parent list, restoring the parent's highlighted index, pagination window, and search query. `<EnhancedSelectInput>` renders a breadcrumb of the current navigation path above the list whenever nested (`depth > 0`):

```tsx
import { EnhancedSelectInput } from 'ink-enhanced-select-input'

const items = [
  {
    label: 'Fruits',
    value: 'fruits',
    children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ],
  },
  { label: 'Vegetables', value: 'vegetables', children: [] },
]

;<EnhancedSelectInput items={items} onSelect={(item) => console.log(item)} />
```

Descending into "Fruits" renders a `Fruits` breadcrumb line above the list (default component joins `path` labels with `' › '`). The breadcrumb is:

- Shown by default whenever `depth > 0`; set `showBreadcrumb={false}` to hide it.
- Customizable via `breadcrumbComponent`, which receives `BreadcrumbProps` (`path: Item<V>[]`, `theme`):

```tsx
<EnhancedSelectInput
  items={items}
  breadcrumbComponent={({ path }) => (
    <Text dimColor>{path.map((p) => p.label).join(' / ')}</Text>
  )}
/>
```

For a fully custom renderer, the headless `useEnhancedSelectInput` hook exposes the same `path`/`depth` so you can build your own breadcrumb:

```tsx
import { useEnhancedSelectInput } from 'ink-enhanced-select-input/headless'

function MyCustomMenu({ onSelect }) {
  const { visibleItems, windowIndex, path, depth } = useEnhancedSelectInput({
    items,
    onSelect,
  })

  return (
    <Box flexDirection="column">
      {depth > 0 && (
        <Text dimColor>{path.map((p) => p.label).join(' › ')}</Text>
      )}
      {visibleItems.map((item, i) => (
        <Text
          key={item.key ?? String(item.value)}
          color={i === windowIndex ? 'cyan' : undefined}
        >
          {item.label}
          {item.children?.length ? ' →' : ''}
        </Text>
      ))}
    </Box>
  )
}
```

- `path` — the chain of parent items descended into to reach the current level, root-to-leaf; empty at the root.
- `depth` — current nesting depth, `0` at the root, incrementing on each descend.

Restrictions (v1): vertical orientation and single-select only — nesting is ignored entirely when `orientation="horizontal"`, when `multiple` is `true`, or when `selectedIndex` (controlled highlight) is supplied. In development, giving any item a non-empty `children` while `orientation="horizontal"` logs a `console.warn` once (since `←`/`→` are already claimed by horizontal navigation, the submenu would otherwise be silently unreachable). A `disabled` item is never descendable. In `searchable` mode, `←`/`→` are claimed by search-cursor movement, so descending is Enter-only and ascending is Escape-only (and the first Escape clears a non-empty search query before it ascends); search filters within the active level only, so descending resets the query and searching in a submenu never matches items from the parent list or sibling submenus. `keyMap.select`/`keyMap.cancel` gate Enter-descend/Escape-ascend the same way they gate `onSelect`/`onCancel`; `keyMap.arrows` independently gates `→`-descend/`←`-ascend, so e.g. `keyMap={{ select: false }}` still allows descending via `→`. The duplicate-`key` dev warning (see below) also scans the active submenu level on each descend, not just the root `items`.

### Focus Management

By default, focus is a manual boolean — the parent decides who's active by passing `isFocused`. Set `focusable` to opt a select into Ink's own focus manager instead, so multiple selects on one screen can Tab between each other without any hand-rolled focus state:

```tsx
import { Box } from 'ink'
import { EnhancedSelectInput } from 'ink-enhanced-select-input'

function App() {
  return (
    <Box flexDirection="column">
      <EnhancedSelectInput
        focusable
        autoFocus
        focusId="fruit"
        items={fruitItems}
      />
      <EnhancedSelectInput focusable focusId="color" items={colorItems} />
    </Box>
  )
}
```

Pressing Tab moves focus between the two selects; only the focused one responds to arrows/Enter/typing. `autoFocus` focuses a select on mount when nothing else is focused yet — set it on at most one instance. `focusId` lets a parent focus a specific select programmatically, via Ink's own `useFocusManager().focus(id)`.

`isFocused` still works alongside `focusable` — `isFocused={false}` force-disables input and drops the component out of the Tab ring even if it's `autoFocus`ed, which is handy for conditionally excluding a select from the ring (e.g. while its data is loading). Omit `isFocused` in `focusable` mode and Ink's focus manager decides.

`focusable` is a static/config-time prop — decide once whether a given select participates in Tab-cycling, rather than toggling it at runtime. The headless `useEnhancedSelectInput` hook is unaffected by any of this: it stays purely `isFocused`-driven, so headless consumers keep wiring up focus themselves.

## Props

These are the props accepted by `<EnhancedSelectInput>` (`EnhancedSelectInputProps<V>`). The individual render-component prop types (`IndicatorProps`, `ItemProps`, `GroupHeaderProps`, `SeparatorProps`) are documented in [Custom Components](#custom-components). Earlier `*Properties` names (`Properties`, `IndicatorProperties`, `ItemProperties`, `GroupHeaderProperties`, `SeparatorProperties`, `UseEnhancedSelectInputProperties`) are still exported as deprecated aliases for backward compatibility and will be removed in a future minor — prefer the `*Props` names above in new code.

| Prop                     | Type                                        | Default                       | Description                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                  | `Array<ItemOrSeparator<V>>`                 | _required_                    | List of selectable items, optionally interspersed with `{ type: 'separator' }` rows                                                                                                                                                                                                             |
| `groups`                 | `string[]`                                  | —                             | Fixes the display/navigation order of item groups instead of relying on `items` array order. Groups appear in the order listed here; groups present on items but not listed fall after all listed groups; ungrouped items (and separators) are placed last. Stable — no intra-group reshuffling |
| `isFocused`              | `boolean`                                   | `true`                        | Whether the component responds to input. When `focusable` is set, this instead gates eligibility (`false` force-disables and drops out of the Tab ring; otherwise Ink's focus manager decides)                                                                                                  |
| `focusable`              | `boolean`                                   | `false`                       | Opt into Ink's focus manager (`useFocus`) instead of the manual `isFocused` boolean alone, so Tab can cycle between several selects. Treat as a static/config-time prop — see [Focus management](#focus-management)                                                                             |
| `autoFocus`              | `boolean`                                   | `false`                       | Focus this select on mount when nothing else is focused yet. Only meaningful when `focusable` is set                                                                                                                                                                                            |
| `focusId`                | `string`                                    | —                             | Stable id for Ink's focus manager, so a parent can call `useFocusManager().focus(id)`. Only meaningful when `focusable` is set                                                                                                                                                                  |
| `initialIndex`           | `number`                                    | —                             | Index of the initially highlighted item (uncontrolled — ignored once `selectedIndex` is set)                                                                                                                                                                                                    |
| `initialKey`             | `string`                                    | —                             | Highlight the item whose `key` (or `String(value)` fallback) matches at mount. Wins over `initialValue` and `initialIndex`. Initial-only                                                                                                                                                        |
| `initialValue`           | `V`                                         | —                             | Highlight the first item whose `value` matches (`===`) at mount. Wins over `initialIndex`, loses to `initialKey`. Initial-only                                                                                                                                                                  |
| `autoSelectFirstEnabled` | `boolean`                                   | `true`                        | Fall back to the first enabled item only when none of `initialKey`/`initialValue`/`initialIndex` resolve. `false` starts with no highlight until the user navigates — it does not gate an explicit `initialIndex`                                                                               |
| `selectedIndex`          | `number`                                    | —                             | Controls the highlighted index from outside the component. Combine with `onIndexChange`; the parent must feed the value back for the highlight to move                                                                                                                                          |
| `onIndexChange`          | `(index: number) => void`                   | —                             | Called with the next index whenever a keypress would move the highlight. Only meaningful when `selectedIndex` is provided                                                                                                                                                                       |
| `limit`                  | `number`                                    | —                             | Max number of visible rows — items **and** group headers count, one row each; the default components truncate overlong labels/group names rather than wrapping them                                                                                                                             |
| `paginationMode`         | `'page' \| 'scroll'`                        | `'page'`                      | How the `limit` window advances: `'page'` snaps to fixed page boundaries; `'scroll'` follows the cursor one row at a time                                                                                                                                                                       |
| `scrollOffset`           | `number`                                    | `0`                           | Rows of context to keep above/below the cursor before scrolling. Only used when `paginationMode` is `'scroll'`. Clamped internally to `floor((limit - 1) / 2)`                                                                                                                                  |
| `indicatorComponent`     | `FC<IndicatorProps>`                        | `DefaultIndicatorComponent`   | Custom selection indicator                                                                                                                                                                                                                                                                      |
| `itemComponent`          | `FC<ItemProps>`                             | `DefaultItemComponent`        | Custom item renderer                                                                                                                                                                                                                                                                            |
| `onSelect`               | `(item: Item<V>) => void`                   | —                             | Called on selection (Enter or hotkey) — single-select only                                                                                                                                                                                                                                      |
| `onHighlight`            | `(item: Item<V>) => void`                   | —                             | Called when the highlighted item changes                                                                                                                                                                                                                                                        |
| `onCancel`               | `() => void`                                | —                             | Called when Escape is pressed                                                                                                                                                                                                                                                                   |
| `orientation`            | `'vertical' \| 'horizontal'`                | `'vertical'`                  | Layout direction                                                                                                                                                                                                                                                                                |
| `showScrollIndicators`   | `boolean`                                   | `false`                       | Show ▲/▼ or ◀/▶ counts when `limit` clips the list                                                                                                                                                                                                                                              |
| `multiple`               | `boolean`                                   | `false`                       | Enable multi-select mode (Space toggles, Enter confirms)                                                                                                                                                                                                                                        |
| `defaultSelectedKeys`    | `string[]`                                  | —                             | Pre-checked item keys for multi-select, read once on mount (uncontrolled — ignored once `selectedKeys` is set; see [Multi-select](#multi-select) note below). Keys belonging to `disabled` items are ignored — a disabled item can never be checked or seeded into `onConfirm`                  |
| `selectedKeys`           | `string[]`                                  | —                             | Controls the checked keys from outside the component in multi-select mode. Combine with `onSelectedKeysChange`; the parent must feed the value back for checkboxes to update                                                                                                                    |
| `onSelectedKeysChange`   | `(keys: string[]) => void`                  | —                             | Called with the next checked-keys array whenever Space/`toggle()` would change the checked set. Only meaningful when `selectedKeys` is provided                                                                                                                                                 |
| `onConfirm`              | `(items: Array<Item<V>>) => void`           | —                             | Called on Enter in multi-select mode with all checked items, unaffected by the active search filter                                                                                                                                                                                             |
| `confirmScope`           | `'all' \| 'filtered'`                       | `'all'`                       | Which items `onConfirm` draws from in multi-select mode; `'filtered'` restores the old behaviour of only confirming checked items that match the active search query                                                                                                                            |
| `onToggle`               | `(item: Item<V>, checked: boolean) => void` | —                             | Called each time an item is toggled in multi-select mode                                                                                                                                                                                                                                        |
| `minSelections`          | `number`                                    | —                             | Minimum checked items required for `onConfirm` to fire in multi-select mode; Enter is a no-op below this count                                                                                                                                                                                  |
| `maxSelections`          | `number`                                    | —                             | Maximum items that may be checked at once in multi-select mode; `toggle`/bulk actions refuse to check beyond this cap                                                                                                                                                                           |
| `showSelectionCount`     | `boolean`                                   | `false`                       | Render an "N selected" line (with a `/min` or `/max` hint) above the list in multi-select mode                                                                                                                                                                                                  |
| `checkedIndicator`       | `string`                                    | `'[x]'`                       | Glyph shown for a checked item in multi-select mode                                                                                                                                                                                                                                             |
| `uncheckedIndicator`     | `string`                                    | `'[ ]'`                       | Glyph shown for an unchecked item in multi-select mode                                                                                                                                                                                                                                          |
| `groupHeaderComponent`   | `FC<GroupHeaderProps>`                      | `DefaultGroupHeaderComponent` | Custom group header renderer                                                                                                                                                                                                                                                                    |
| `separatorComponent`     | `FC<SeparatorProps>`                        | `DefaultSeparatorComponent`   | Custom renderer for `{ type: 'separator' }` rows                                                                                                                                                                                                                                                |
| `breadcrumbComponent`    | `FC<BreadcrumbProps>`                       | `DefaultBreadcrumbComponent`  | Custom renderer for the breadcrumb row shown above the list when nested — see [Nested Items](#nested-items)                                                                                                                                                                                     |
| `showBreadcrumb`         | `boolean`                                   | `true`                        | Show the breadcrumb of the current navigation `path` above the list whenever nested (`depth > 0`)                                                                                                                                                                                               |
| `searchable`             | `boolean`                                   | `false`                       | Enable inline search/filter mode                                                                                                                                                                                                                                                                |
| `searchPlaceholder`      | `string`                                    | `'Search...'`                 | Placeholder text shown when search query is empty                                                                                                                                                                                                                                               |
| `matchMode`              | `'includes' \| 'fuzzy'`                     | `'includes'`                  | Built-in search matcher; `'fuzzy'` matches an ordered, non-contiguous subsequence. Ignored when `filter` is supplied                                                                                                                                                                            |
| `searchFields`           | `(item: Item<V>) => string \| string[]`     | `item.label`                  | Selects which text field(s) the built-in matcher searches. Ignored when `filter` is supplied                                                                                                                                                                                                    |
| `filter`                 | `(item: Item<V>, query: string) => boolean` | —                             | Fully overrides the built-in search matching; `matchMode` and `searchFields` are ignored                                                                                                                                                                                                        |
| `onSearchChange`         | `(query: string) => void`                   | —                             | Called with the next search query whenever it would change. Only used when `searchable` is true; see [Live/Async Search](#liveasync-search)                                                                                                                                                     |
| `searchQuery`            | `string`                                    | —                             | Controls the search query from outside the component. Combine with `onSearchChange`; also disables built-in filtering (the parent supplies an already-filtered `items`) — see [Live/Async Search](#liveasync-search)                                                                            |
| `searchDebounce`         | `number`                                    | —                             | Debounces `onSearchChange` by this many ms; the displayed query still updates immediately. Intended for an uncontrolled `searchQuery`                                                                                                                                                           |
| `isLoading`              | `boolean`                                   | `false`                       | Renders a loading row beneath the search input; replaces "No matches" when the current item list is also empty                                                                                                                                                                                  |
| `loadingText`            | `string`                                    | `'Searching…'`                | Text shown by the default loading row. Only used when `isLoading` is true                                                                                                                                                                                                                       |
| `loadingComponent`       | `FC<LoadingProperties>`                     | `DefaultLoadingComponent`     | Custom renderer for the loading row. Only used when `isLoading` is true                                                                                                                                                                                                                         |
| `keyMap`                 | `KeyMap`                                    | all enabled                   | Selectively disable built-in key groups to avoid conflicts                                                                                                                                                                                                                                      |
| `typeahead`              | `boolean`                                   | `false`                       | Enable type-ahead jump to the first item matching typed characters; ignored when `searchable`                                                                                                                                                                                                   |
| `typeaheadTimeout`       | `number`                                    | `500`                         | Idle window (ms) after which the type-ahead buffer resets                                                                                                                                                                                                                                       |
| `maxWidth`               | `number`                                    | —                             | Max display width (characters) for a label; longer labels are ellipsized so each item stays on one row. Display-only — search, `onSelect`/`onHighlight`/`onConfirm`, and hotkeys still use the full label                                                                                       |
| `truncate`               | `'end' \| 'middle' \| 'start'`              | `'end'`                       | Where the ellipsis lands when `maxWidth` truncates a label. `'middle'` is useful for file paths                                                                                                                                                                                                 |
| `loop`                   | `boolean`                                   | `true`                        | Whether arrow/vim/Page Up/Down navigation wraps around at the list boundary; `false` clamps instead. `Home`/`End` are unaffected                                                                                                                                                                |
| `theme`                  | `Partial<Theme>`                            | see [Theming](#theming)       | Override default component colors; automatically disabled when `NO_COLOR` is set                                                                                                                                                                                                                |

### Item Shape

```ts
type Item<V> = {
  key?: string // Required when V is an object — see note below
  label: string
  value: V
  hotkey?: string
  indicator?: React.ReactNode // Single-select only — ignored (with a dev warning) when `multiple` is true
  disabled?: boolean
  group?: string // Items with the same group are rendered under a shared header
  description?: string // Rendered dimmed on its own line beneath the label
  hint?: string // Rendered dimmed to the right of the label
  disabledReason?: string // Rendered dimmed beside the label when `disabled` is true
  children?: Item<V>[] // Submenu items — see [Nested Items](#nested-items)
}

type SeparatorItem = {
  type: 'separator'
  key?: string
}

type ItemOrSeparator<V> = Item<V> | SeparatorItem
```

> **`key` field:** React uses `key` (or `String(value)` as a fallback) to track
> list items. When `V` is a non-primitive type such as an object, `String(value)`
> always produces `"[object Object]"`, causing duplicate key warnings and
> potential rendering bugs. Always set `key` to a stable unique string when
> `value` is an object.

## Keyboard Navigation

> Upgrading from `v0.2.0`? See [`MIGRATION.md`](./MIGRATION.md) for the keyboard-behavior changes since then (Home/End, vim keys, `Escape`/`onCancel`, multi-select `Space`, hotkey precedence, `keyMap`).

| Orientation | Previous  | Next      | Page Back | Page Forward | First  | Last  | Select / Confirm | Toggle (multi) | Cancel   | Descend (nested) | Ascend (nested) |
| ----------- | --------- | --------- | --------- | ------------ | ------ | ----- | ---------------- | -------------- | -------- | ---------------- | --------------- |
| Vertical    | `↑` / `k` | `↓` / `j` | `Page Up` | `Page Down`  | `Home` | `End` | `Enter`          | `Space`        | `Escape` | `Enter` / `→`    | `Escape` / `←`  |
| Horizontal  | `←` / `h` | `→` / `l` | `Page Up` | `Page Down`  | `Home` | `End` | `Enter`          | `Space`        | `Escape` | —                | —               |

In **single-select** mode, `Enter` calls `onSelect` and hotkeys select immediately. In **multi-select** mode (`multiple={true}`), `Space` toggles the highlighted item and `Enter` calls `onConfirm` with all checked items (gated on `minSelections`/`maxSelections`, if set). `Ctrl+A`/`Ctrl+D`/`Ctrl+R` select-all/none/invert. Hotkeys are disabled in multi-select mode to avoid ambiguity with `Space`.

Nesting (`children` on an item — see [Nested Items](#nested-items)) only applies in vertical, single-select, uncontrolled-highlight mode; `Enter`/`→` descend into a parent item's `children` and `Escape`/`←` ascend back out.

`Page Up`/`Page Down` move the highlight by a page at a time — the number of items currently visible in the `limit` window, or 10 when `limit` is not set.

Disabled items are automatically skipped during navigation, including by `Home`, `End`, `Page Up`, and `Page Down`.

`Escape` calls the `onCancel` prop when provided — useful for multi-step CLI flows that need a "go back" action.

By default, navigation wraps around at the list boundary (pressing `↓`/`Page Down` on the last item jumps back to the first). Set `loop={false}` to clamp instead — the highlight stops at the first/last item rather than wrapping, which can feel less disorienting in long lists. `Home`/`End` always jump to the absolute boundary regardless of `loop`.

```tsx
<EnhancedSelectInput items={items} loop={false} onSelect={onSelect} />
```

> **Hotkey constraints:** Navigation keys take priority over hotkeys. In vertical
> orientation the characters `j` and `k` are reserved for navigation — an item
> hotkey set to either of these values will never fire. Similarly, `h` and `l`
> are reserved in horizontal orientation. Choose hotkeys outside these sets to
> avoid conflicts.

> **Searchable mode:** When `searchable` is enabled, vim keys and hotkeys are
> disabled — all printable characters go to the search query. Arrow keys still
> navigate. Backspace edits the query. Escape clears it.

> **Type-ahead mode:** When `typeahead` is enabled (and `searchable` is not),
> printable characters build a jump buffer instead of firing hotkeys or search.
> The highlight jumps to the first matching item; no selection is made. An
> idle/empty buffer still yields to a matching hotkey.

## Development

```bash
git clone https://github.com/gfargo/ink-enhanced-select-input.git
cd ink-enhanced-select-input
yarn install
```

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `yarn build`    | Compile TypeScript to `dist/`                |
| `yarn start`    | Build and run the interactive storybook demo |
| `yarn test`     | Build and run tests                          |
| `yarn lint`     | Check formatting and lint                    |
| `yarn lint:fix` | Auto-fix formatting and lint issues          |

### Examples

Runnable, single-feature demos live in [`examples/`](./examples/README.md) — one `.tsx` file per feature, no build step required:

```bash
node --loader ts-node/esm examples/01-vertical.tsx
```

## Contributing

Contributions are welcome. Feel free to open [issues](https://github.com/gfargo/ink-enhanced-select-input/issues), submit pull requests, or provide feedback.

## License

[MIT](./LICENSE)
