// Horizontal orientation.
// Run: node --loader ts-node/esm examples/02-horizontal.tsx
import React from 'react'
import { render, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'Option 1', value: 'one', hotkey: '1' },
  { label: 'Option 2', value: 'two', hotkey: '2' },
  { label: 'Option 3', value: 'three', disabled: true },
  { label: 'Option 4', value: 'four', hotkey: '4' },
]

function Demo() {
  const { exit } = useApp()

  return (
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onSelect={(item) => {
        console.log(`Selected: ${item.value}`)
        exit()
      }}
    />
  )
}

render(<Demo />)
