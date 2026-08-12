// `keyMap` disables individual key groups so a parent handler can own them
// instead — here `j`/`k` are freed up for a parent vim-style navigator.
// Run: node --loader ts-node/esm examples/12-keymap.tsx
import React from 'react'
import { Box, render, Text, useApp, useInput } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'Option 1', value: 'one' },
  { label: 'Option 2', value: 'two' },
  { label: 'Option 3', value: 'three' },
]

function Demo() {
  const { exit } = useApp()

  useInput((input) => {
    if (input === 'j' || input === 'k') {
      console.log(`Parent handled: ${input}`)
    }
  })

  return (
    <Box flexDirection="column">
      <Text dimColor>
        j/k are handled by the parent above — only arrow keys navigate here:
      </Text>
      <EnhancedSelectInput
        items={items}
        keyMap={{ vimKeys: false }}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
      />
    </Box>
  )
}

render(<Demo />)
