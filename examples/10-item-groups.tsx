// `group` organizes items under non-navigable section headers.
// Run: node --loader ts-node/esm examples/10-item-groups.tsx
import React from 'react'
import { render, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'TypeScript', value: 'ts', group: 'Languages' },
  { label: 'Rust', value: 'rust', group: 'Languages' },
  { label: 'Go', value: 'go', group: 'Languages' },
  { label: 'React', value: 'react', group: 'Frameworks' },
  { label: 'Ink', value: 'ink', group: 'Frameworks' },
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
