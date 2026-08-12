// Fully custom `itemComponent`/`indicatorComponent` rendering.
// Run: node --loader ts-node/esm examples/06-custom-item-component.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import {
  EnhancedSelectInput,
  type IndicatorProps,
  type ItemProps,
} from '../src/enhanced-select-input/index.js'

function MyIndicator({ isSelected }: IndicatorProps) {
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
}: ItemProps) {
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

const items = [
  { label: 'View Hotkeys', value: 'hotkeys' },
  { label: 'View Custom Indicators', value: 'indicators' },
  {
    label: 'View Custom Item Component',
    value: 'custom-item',
    disabled: true,
    disabledReason: 'already here',
  },
]

function Demo() {
  const { exit } = useApp()

  return (
    <Box flexDirection="column">
      <Text dimColor>Custom item and indicator component:</Text>
      <EnhancedSelectInput
        items={items}
        indicatorComponent={MyIndicator}
        itemComponent={MyItem}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
      />
    </Box>
  )
}

render(<Demo />)
