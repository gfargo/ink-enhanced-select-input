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

## Installation

```bash
npm install ink-enhanced-select-input
```

or

```bash
yarn add ink-enhanced-select-input
```

## Usage Example

```jsx
import React from 'react';
import { render, Text } from 'ink';
import { EnhancedSelectInput } from 'ink-enhanced-select-input';

const items = [
  { label: 'Option 1', value: 'one', hotkey: '1' },
  { label: 'Option 2', value: 'two', hotkey: '2' },
  { label: 'Option 3', value: 'three', disabled: true },
  { label: 'Option 4', value: 'four', hotkey: '4' }
];

function Demo() {
  const handleSelect = (item) => {
    console.log(`Selected: ${item.value}`);
  };

  const handleHighlight = (item) => {
    console.log(`Highlighted: ${item.value}`);
  };

  return (
    <>
      <Text>Select an option:</Text>
      <EnhancedSelectInput
        items={items}
        orientation="horizontal"
        onSelect={handleSelect}
        onHighlight={handleHighlight}
      />
    </>
  );
}

render(<Demo />);
```

## Props

### `items` (required)

- **Type:** `Array<{ label: string; value: V; hotkey?: string; indicator?: React.ReactNode; disabled?: boolean }>`
- **Description:** The list of items to display. Each item defines its own label, value, an optional hotkey for quick selection, optional custom indicator, and whether it’s disabled.

### `isFocused`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** When `false`, the component won’t respond to input.

### `initialIndex`

- **Type:** `number`
- **Default:** `0`
- **Description:** The index of the item that should be highlighted initially.

### `limit`

- **Type:** `number`
- **Default:** *undefined*
- **Description:** How many items to display at once. If provided, only that many items are rendered.

### `indicatorComponent`

- **Type:** `React.FC<{isSelected: boolean; item: Item<V>;}>`
- **Default:** A simple `>` arrow when selected.
- **Description:** Custom component to render in front of selected item labels.

### `itemComponent`

- **Type:** `React.FC<{isSelected: boolean; label: string; isDisabled: boolean;}>`
- **Default:** Renders the item label in green if selected, gray if disabled, or default otherwise.
- **Description:** Custom renderer for the individual item line.

### `onSelect`

- **Type:** `(item: Item<V>) => void`
- **Default:** *undefined*
- **Description:** Called when the user confirms a selection (via `Enter` or a hotkey).

### `onHighlight`

- **Type:** `(item: Item<V>) => void`
- **Default:** *undefined*
- **Description:** Called whenever the highlighted (focused) item changes.

### `orientation`

- **Type:** `'vertical' | 'horizontal'`
- **Default:** `'vertical'`
- **Description:** Sets the layout direction of items.

## Customization

You can customize how items and indicators are rendered:

```jsx
function MyIndicator({ isSelected }) {
  return (
    <Text color={isSelected ? 'magenta' : undefined}>
      {isSelected ? '👉' : '  '}
    </Text>
  );
}

function MyItem({ isSelected, isDisabled, label }) {
  return (
    <Text
      color={isDisabled ? 'gray' : isSelected ? 'yellow' : 'white'}
      dimColor={isDisabled}
    >
      {label}
    </Text>
  );
}

<EnhancedSelectInput
  items={[
    { label: 'First', value: '1' },
    { label: 'Second', value: '2', disabled: true },
    { label: 'Third', value: '3', hotkey: 't' }
  ]}
  indicatorComponent={MyIndicator}
  itemComponent={MyItem}
/>
```

## Development Setup

1. Clone the repository and navigate to the project directory.
2. Install dependencies
3. Build and run the storybook-like test application locally:

   ```bash
   npm run build
   npm start
   ```

   This will run `dist/storybook.js`, a local testing interface to interact with and visualize different configurations of the component.

4. Run tests:

   ```bash
   npm test
   ```

   Uses [AVA](https://github.com/avajs/ava) for a fast test suite.

## Contributing

Contributions are welcome! Feel free to open [issues](https://github.com/gfargo/ink-enhanced-select-input/issues), submit pull requests, or provide feedback. Suggestions for improvements, new features, or bug reports are all appreciated.

## License

This project is licensed under the [MIT License](./LICENSE).
