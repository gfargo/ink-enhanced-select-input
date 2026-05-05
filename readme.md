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
- **Keyboard Navigation:** Arrow keys and Vim-like keys (`h/j/k/l`) supported.
- **Hooks for Highlight & Selection:** Run custom logic on highlight and selection changes.
- **Limit Displayed Items:** Restrict how many options to show at once.

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

## Props

| Prop                 | Type                         | Default                     | Description                              |
| -------------------- | ---------------------------- | --------------------------- | ---------------------------------------- |
| `items`              | `Array<Item<V>>`             | _required_                  | List of selectable items                 |
| `isFocused`          | `boolean`                    | `true`                      | Whether the component responds to input  |
| `initialIndex`       | `number`                     | `0`                         | Index of the initially highlighted item  |
| `limit`              | `number`                     | —                           | Max number of visible items              |
| `indicatorComponent` | `FC<IndicatorProps>`         | `DefaultIndicatorComponent` | Custom selection indicator               |
| `itemComponent`      | `FC<ItemProps>`              | `DefaultItemComponent`      | Custom item renderer                     |
| `onSelect`           | `(item: Item<V>) => void`    | —                           | Called on selection (Enter or hotkey)    |
| `onHighlight`        | `(item: Item<V>) => void`    | —                           | Called when the highlighted item changes |
| `onCancel`           | `() => void`                 | —                           | Called when Escape is pressed            |
| `orientation`        | `'vertical' \| 'horizontal'` | `'vertical'`                | Layout direction                         |
| `showScrollIndicators` | `boolean`                  | `false`                     | Show ▲/▼ or ◀/▶ counts when `limit` clips the list |

### Item Shape

```ts
type Item<V> = {
  key?: string        // Required when V is an object — see note below
  label: string
  value: V
  hotkey?: string
  indicator?: React.ReactNode
  disabled?: boolean
}
```

> **`key` field:** React uses `key` (or `String(value)` as a fallback) to track
> list items. When `V` is a non-primitive type such as an object, `String(value)`
> always produces `"[object Object]"`, causing duplicate key warnings and
> potential rendering bugs. Always set `key` to a stable unique string when
> `value` is an object.

## Keyboard Navigation

| Orientation | Previous  | Next      | First    | Last    | Select  | Cancel   |
| ----------- | --------- | --------- | -------- | ------- | ------- | -------- |
| Vertical    | `↑` / `k` | `↓` / `j` | `Home`   | `End`   | `Enter` | `Escape` |
| Horizontal  | `←` / `h` | `→` / `l` | `Home`   | `End`   | `Enter` | `Escape` |

Hotkeys (when assigned) select the item immediately. Disabled items are automatically skipped during navigation, including by `Home` and `End`.

`Escape` calls the `onCancel` prop when provided — useful for multi-step CLI flows that need a "go back" action.

> **Hotkey constraints:** Navigation keys take priority over hotkeys. In vertical
> orientation the characters `j` and `k` are reserved for navigation — an item
> hotkey set to either of these values will never fire. Similarly, `h` and `l`
> are reserved in horizontal orientation. Choose hotkeys outside these sets to
> avoid conflicts.

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
