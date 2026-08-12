// `multiple` mode — Space toggles, Ctrl+A/D/R bulk select-all/none/invert,
// Enter confirms (gated on minSelections/maxSelections).
// Run: node --loader ts-node/esm examples/08-multi-select.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../src/enhanced-select-input/index.js'

const items = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'React', value: 'react' },
  { label: 'Ink', value: 'ink' },
  { label: 'Node.js', value: 'node' },
  { label: 'Legacy (unavailable)', value: 'legacy', disabled: true },
]

function Demo() {
  const { exit } = useApp()

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Space to toggle, Ctrl+A/D/R to select-all/none/invert, Enter to confirm
        (pick 1-3):
      </Text>
      <EnhancedSelectInput
        multiple
        showSelectionCount
        defaultSelectedKeys={['ts']}
        minSelections={1}
        maxSelections={3}
        checkedIndicator="✔"
        uncheckedIndicator="✗"
        items={items}
        onConfirm={(selected) => {
          console.log(
            'Confirmed:',
            selected.map((item) => item.label).join(', ')
          )
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
