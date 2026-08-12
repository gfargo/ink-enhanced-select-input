// `useEnhancedSelectInput` — fully custom renderer with built-in navigation,
// hotkeys, and pagination.
// Run: node --loader ts-node/esm examples/13-headless-hook.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { useEnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'React', value: 'react' },
  { label: 'Ink', value: 'ink' },
  { label: 'Node.js', value: 'node' },
]

function CustomSelect() {
  const { exit } = useApp()
  const { visibleItems, windowIndex, itemsAbove, itemsBelow } =
    useEnhancedSelectInput({
      items,
      onSelect(item) {
        console.log(`Selected: ${item.value}`)
        exit()
      },
    })

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

render(<CustomSelect />)
