# Ink Enhanced Select Input

[![npm version](https://img.shields.io/npm/v/ink-enhanced-select-input.svg)](https://www.npmjs.com/package/ink-enhanced-select-input)
[![license](https://img.shields.io/github/license/gfargo/ink-enhanced-select-input.svg)](./LICENSE)

An enhanced, customizable select input component for [Ink](https://github.com/vadimdemedes/ink) that supports both vertical and horizontal orientations, hotkeys, and flexible rendering. Ideal for building rich, interactive CLI apps with React.

## Features

- **Orientation:** Choose between vertical or horizontal layout for your choices.
- **Custom Indicators & Items:** Easily swap out the default indicator and item rendering components.
- **Hotkey Support:** Assign single-character hotkeys to items for quick selection.
- **Disabled Items:** Prevent selection of certain options and skip them when navigating.
- **Keyboard Navigation:** Navigate with arrow keys or Vim-like keybindings (`h/j/k/l`).
- **Focus & Highlight Callbacks:** Respond to highlight changes and final selections with callback hooks.
- **Limit Displayed Items:** Restrict the visible list and (optionally) implement pagination-like behavior.

## Installation

```bash
npm install ink-enhanced-select-input
```

or

```bash
yarn add ink-enhanced-select-input
```

## Usage

```jsx
import React from 'react';
import { render, Text } from 'ink';
import EnhancedSelectInput from 'ink-enhanced-select-input';

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

**`items`**: `Array<Item<V>>`  
List of items to display. Each item should contain:
  - `label: string` - The display text.
  - `value: V` - The value associated with the item.
  - `hotkey?: string` - A single character for quick select.
  - `indicator?: React.ReactNode` - A custom indicator to show when the item is selected.
  - `disabled?: boolean` - If true, the item will be skipped when navigating and cannot be selected.

**`isFocused`**: `boolean` (default: `true`)  
Determines if the component should respond to user input. Useful for controlling focus when using multiple Ink components.

**`initialIndex`**: `number` (default: `0`)  
The index of the item that should be highlighted initially.

**`limit`**: `number` (optional)  
Limit the number of items displayed at once. Future versions may support scrolling/pagination.

**`orientation`**: `'vertical' | 'horizontal'` (default: `vertical`)  
Sets the layout of items. Vertical stacks items downward; horizontal places them side-by-side.

**`indicatorComponent`**: `React.FC<IndicatorProperties>` (optional)  
Custom component to render the selection indicator.

**`itemComponent`**: `React.FC<ItemProperties>` (optional)  
Custom component to render individual items.

**`onSelect`**: `(item: Item<V>) => void` (optional)  
Callback triggered when the user confirms a selection by pressing `Enter` or via a hotkey.

**`onHighlight`**: `(item: Item<V>) => void` (optional)  
Callback triggered whenever the highlighted (focused) item changes.

## Customization

You can provide your own `indicatorComponent` and `itemComponent` to fully customize the rendering. For example:

```jsx
function MyIndicator({ isSelected }) {
  return (
    <Text color={isSelected ? 'magenta' : undefined}>
      {isSelected ? '👉' : '  '}
    </Text>
  );
}

function MyItem({ isSelected, label, isDisabled }) {
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
  items={items}
  indicatorComponent={MyIndicator}
  itemComponent={MyItem}
/>
```

## Roadmap & Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve functionality, fix bugs, or enhance documentation.

### Potential Future Features

- Support for scrolling or pagination when `limit` is reached.
- More advanced filtering and dynamic item updates.
- Pre-mapped hotkeys and shortcuts for even faster navigation.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/gfargo/ink-enhanced-select-input.git
   ```
2. Install dependencies:
   ```bash
   cd ink-enhanced-select-input
   npm install
   ```
3. Run tests:
   ```bash
   npm test
   ```

## License

This project is licensed under the [MIT License](./LICENSE).
 