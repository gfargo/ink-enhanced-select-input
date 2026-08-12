// `searchable` — type to filter items inline, case-insensitive by default.
// Run: node --loader ts-node/esm examples/09-searchable.tsx
import React from 'react'
import { render, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'JavaScript', value: 'js' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'Python', value: 'python' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
]

function Demo() {
  const { exit } = useApp()

  return (
    <EnhancedSelectInput
      searchable
      searchPlaceholder="Filter languages..."
      items={items}
      onSelect={(item) => {
        console.log(`Selected: ${item.value}`)
        exit()
      }}
      onCancel={() => {
        exit()
      }}
    />
  )
}

render(<Demo />)
