// Hotkey selection — press a hotkey character to select immediately.
// Run: node --loader ts-node/esm examples/03-hotkeys.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'Custom Indicators', value: 'custom-indicators', hotkey: 'i' },
  { label: 'Custom Item Component', value: 'custom-item', hotkey: 'c' },
  { label: 'Searchable', value: 'searchable', hotkey: 's' },
  { label: 'Quit', value: 'quit', hotkey: 'q' },
]

function Demo() {
  const { exit } = useApp()

  return (
    <Box flexDirection="column">
      <Text dimColor>Press a hotkey (i/c/s/q) or navigate with arrows:</Text>
      <EnhancedSelectInput
        items={items}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
      />
    </Box>
  )
}

render(<Demo />)
