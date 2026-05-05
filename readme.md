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
- **Keyboard Navigation:** Arrow keys, Vim-like keys (`h/j/k/l`), Home/End supported.
- **Hooks for Highlight & Selection:** Run custom logic on highlight and selection changes.
- **Limit Displayed Items:** Restrict how many options to show at once, with optional scroll indicators.
- **Multi-select Mode:** Space to toggle, Enter to confirm a multi-item selection.
- **Searchable Mode:** Type to filter items inline with case-insensitive matching.
- **Item Groups:** Organize items under non-navigable section headers.
- **Cancel / Escape:** `onCancel` prop for multi-step CLI "go back" flows.
- **Headless Hook:** `useEnhancedSelectInput` for fully custom renderers with built-in behavior.

## Compatibility

| Dependency | Required Version |
| ---------- | ---------------- |
| Node.js    | >= 20            |
| React      | >= 19            |
| Ink        | >= 6             |

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

- Printable characters are captured as search input
- `Backspace` removes the last character from the query
- `Escape` clears the query; if already empty, calls `onCancel`
- Arrow keys navigate the filtered results
- Vim keys (`h/j/k/l`) are treated as search characters, not navigation
- Hotkeys are disabled (characters go to the search query)
- "No matches" is shown when the query matches nothing

### Custom Components

```tsx
function MyIndicator({ isSelected }) {
  return (
    <Text color={isSelected ? 'magenta' : undefined}>
      {isSelected ? '👉' : '  '}
    </Text>
  )
}

function MyItem({ isSelected, isDisabled, label }) {
  return (
    <Text
      color={isDisabled ? 'gray' : isSelected ? 'yellow' : 'white'}
      dimColor={isDisabled}
    >
      {label}
    </Text>
  )
}

;<EnhancedSelectInput
  items={items}
  indicatorComponent={MyIndicator}
  itemComponent={MyItem}
/>
```

### Headless Hook

If you need a fully custom renderer while keeping the built-in navigation, hotkeys, pagination, and callbacks, import `useEnhancedSelectInput` directly:

```tsx
import { useEnhancedSelectInput } from 'ink-enhanced-select-input'

function MyCustomSelect({ items, onSelect }) {
  const { selectedIndex, visibleItems, itemsAbove, itemsBelow } =
    useEnhancedSelectInput({ items, onSelect })

  return (
    <Box flexDirection="column">
      {itemsAbove > 0 && <Text dimColor>↑ {itemsAbove} more</Text>}
      {visibleItems.map((item, i) => (
        <Text
          key={item.key ?? String(item.value)}
          color={i === selectedIndex ? 'cyan' : undefined}
        >
          {item.label}
        </Text>
      ))}
      {itemsBelow > 0 && <Text dimColor>↓ {itemsBelow} more</Text>}
    </Box>
  )
}
```

The hook accepts all the same props as `EnhancedSelectInput` except `indicatorComponent`, `itemComponent`, `groupHeaderComponent`, `showScrollIndicators`, and `searchPlaceholder`. It returns `{ selectedIndex, rotateIndex, visibleItems, hasItems, itemsAbove, itemsBelow, checkedKeys, searchQuery }`. `checkedKeys` is a `Set<string>` of checked item keys — only populated when `multiple` is `true`. `searchQuery` is the current filter string — empty when `searchable` is false.

## Props

| Prop                   | Type                                        | Default                       | Description                                                 |
| ---------------------- | ------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `items`                | `Array<Item<V>>`                            | _required_                    | List of selectable items                                    |
| `isFocused`            | `boolean`                                   | `true`                        | Whether the component responds to input                     |
| `initialIndex`         | `number`                                    | `0`                           | Index of the initially highlighted item                     |
| `limit`                | `number`                                    | —                             | Max number of visible items                                 |
| `indicatorComponent`   | `FC<IndicatorProps>`                        | `DefaultIndicatorComponent`   | Custom selection indicator                                  |
| `itemComponent`        | `FC<ItemProps>`                             | `DefaultItemComponent`        | Custom item renderer                                        |
| `onSelect`             | `(item: Item<V>) => void`                   | —                             | Called on selection (Enter or hotkey) — single-select only  |
| `onHighlight`          | `(item: Item<V>) => void`                   | —                             | Called when the highlighted item changes                    |
| `onCancel`             | `() => void`                                | —                             | Called when Escape is pressed                               |
| `orientation`          | `'vertical' \| 'horizontal'`                | `'vertical'`                  | Layout direction                                            |
| `showScrollIndicators` | `boolean`                                   | `false`                       | Show ▲/▼ or ◀/▶ counts when `limit` clips the list          |
| `multiple`             | `boolean`                                   | `false`                       | Enable multi-select mode (Space toggles, Enter confirms)    |
| `defaultSelectedKeys`  | `string[]`                                  | —                             | Pre-checked item keys for multi-select                      |
| `onConfirm`            | `(items: Array<Item<V>>) => void`           | —                             | Called on Enter in multi-select mode with all checked items |
| `onToggle`             | `(item: Item<V>, checked: boolean) => void` | —                             | Called each time an item is toggled in multi-select mode    |
| `groupHeaderComponent` | `FC<GroupHeaderProps>`                      | `DefaultGroupHeaderComponent` | Custom group header renderer                                |
| `searchable`           | `boolean`                                   | `false`                       | Enable inline search/filter mode                            |
| `searchPlaceholder`    | `string`                                    | `'Search...'`                 | Placeholder text shown when search query is empty           |

### Item Shape

```ts
type Item<V> = {
  key?: string // Required when V is an object — see note below
  label: string
  value: V
  hotkey?: string
  indicator?: React.ReactNode
  disabled?: boolean
  group?: string // Items with the same group are rendered under a shared header
}
```

> **`key` field:** React uses `key` (or `String(value)` as a fallback) to track
> list items. When `V` is a non-primitive type such as an object, `String(value)`
> always produces `"[object Object]"`, causing duplicate key warnings and
> potential rendering bugs. Always set `key` to a stable unique string when
> `value` is an object.

## Keyboard Navigation

| Orientation | Previous  | Next      | First  | Last  | Select / Confirm | Toggle (multi) | Cancel   |
| ----------- | --------- | --------- | ------ | ----- | ---------------- | -------------- | -------- |
| Vertical    | `↑` / `k` | `↓` / `j` | `Home` | `End` | `Enter`          | `Space`        | `Escape` |
| Horizontal  | `←` / `h` | `→` / `l` | `Home` | `End` | `Enter`          | `Space`        | `Escape` |

In **single-select** mode, `Enter` calls `onSelect` and hotkeys select immediately. In **multi-select** mode (`multiple={true}`), `Space` toggles the highlighted item and `Enter` calls `onConfirm` with all checked items. Hotkeys are disabled in multi-select mode to avoid ambiguity with `Space`.

Disabled items are automatically skipped during navigation, including by `Home` and `End`.

`Escape` calls the `onCancel` prop when provided — useful for multi-step CLI flows that need a "go back" action.

> **Hotkey constraints:** Navigation keys take priority over hotkeys. In vertical
> orientation the characters `j` and `k` are reserved for navigation — an item
> hotkey set to either of these values will never fire. Similarly, `h` and `l`
> are reserved in horizontal orientation. Choose hotkeys outside these sets to
> avoid conflicts.

> **Searchable mode:** When `searchable` is enabled, vim keys and hotkeys are
> disabled — all printable characters go to the search query. Arrow keys still
> navigate. Backspace edits the query. Escape clears it.

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

## Contributing

Contributions are welcome. Feel free to open [issues](https://github.com/gfargo/ink-enhanced-select-input/issues), submit pull requests, or provide feedback.

## License

[MIT](./LICENSE)
