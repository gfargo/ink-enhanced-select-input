// `onCancel` fires on Escape — useful for multi-step CLI "go back" flows.
// Run: node --loader ts-node/esm examples/11-cancel-escape.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'Deploy', value: 'deploy' },
  { label: 'Rollback', value: 'rollback' },
  { label: 'View logs', value: 'logs' },
]

function Demo() {
  const { exit } = useApp()

  return (
    <Box flexDirection="column">
      <Text dimColor>Press Escape to cancel, or select an item:</Text>
      <EnhancedSelectInput
        items={items}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
        onCancel={() => {
          console.log('Cancelled')
          exit()
        }}
      />
    </Box>
  )
}

render(<Demo />)
