// `limit` caps visible rows; `showScrollIndicators` renders ▲/▼ hidden-item counts.
// Run: node --loader ts-node/esm examples/07-limit-scroll-indicators.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'Alpha', value: 'a' },
  { label: 'Bravo', value: 'b' },
  { label: 'Charlie', value: 'c' },
  { label: 'Delta', value: 'd' },
  { label: 'Echo', value: 'e' },
  { label: 'Foxtrot', value: 'f' },
  { label: 'Golf', value: 'g' },
  { label: 'Hotel', value: 'h' },
]

function Demo() {
  const { exit } = useApp()

  return (
    <Box flexDirection="column">
      <Text dimColor>Scroll indicators — limit=3 with ▲/▼ counts:</Text>
      <EnhancedSelectInput
        showScrollIndicators
        limit={3}
        items={items}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
        onCancel={() => {
          exit()
        }}
      />
    </Box>
  )
}

render(<Demo />)
