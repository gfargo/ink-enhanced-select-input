// Per-item `indicator` overrides the default cursor glyph in single-select mode.
// Run: node --loader ts-node/esm examples/05-custom-indicators.tsx
import React from 'react'
import { render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

function Demo() {
  const { exit } = useApp()

  return (
    <EnhancedSelectInput
      items={[
        {
          label: 'Save',
          value: 'save',
          indicator: <Text color="green">✔</Text>,
        },
        {
          label: 'Delete',
          value: 'delete',
          indicator: <Text color="red">✘</Text>,
        },
        { label: 'Cancel', value: 'cancel', hotkey: 'c' },
      ]}
      onSelect={(item) => {
        console.log(`Selected: ${item.value}`)
        exit()
      }}
    />
  )
}

render(<Demo />)
