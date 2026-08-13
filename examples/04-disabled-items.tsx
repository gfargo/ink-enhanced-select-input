// Disabled items are skipped during navigation; `disabledReason` explains why.
// Run: node --loader ts-node/esm examples/04-disabled-items.tsx
import React from 'react'
import { render, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  {
    label: 'Deploy to production',
    value: 'deploy',
    description: 'Pushes the current branch live. This cannot be undone.',
  },
  { label: 'Open file', value: 'open', hint: 'Ctrl+O' },
  {
    label: 'Premium feature',
    value: 'premium',
    disabled: true,
    disabledReason: 'Upgrade to unlock',
  },
]

function Demo() {
  const { exit } = useApp()

  return (
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        console.log(`Selected: ${item.value}`)
        exit()
      }}
    />
  )
}

render(<Demo />)
