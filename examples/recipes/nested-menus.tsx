// A parent menu whose `onSelect` swaps in a submenu's `EnhancedSelectInput`
// — plain state-driven view swapping (same pattern as the wizard recipe),
// not the headless `Item.children` drill-down feature (see readme.md's
// "Nested Items (Headless)" section for that lower-level alternative).
// Submenu items use `group` to organize related actions under a header.
// Run: node --loader ts-node/esm examples/recipes/nested-menus.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import {
  EnhancedSelectInput,
  type Item,
} from '../../src/enhanced-select-input/index.js'

const rootItems: Array<Item<string>> = [
  { label: 'Deploy', value: 'deploy' },
  { label: 'Database', value: 'database' },
  { label: 'Settings', value: 'settings' },
]

const submenus: Record<string, Array<Item<string>>> = {
  deploy: [
    { label: 'Staging', value: 'deploy-staging', group: 'Environments' },
    { label: 'Production', value: 'deploy-production', group: 'Environments' },
  ],
  database: [
    { label: 'Run migrations', value: 'db-migrate', group: 'Maintenance' },
    { label: 'Seed data', value: 'db-seed', group: 'Maintenance' },
    { label: 'Backup', value: 'db-backup', group: 'Maintenance' },
  ],
  settings: [
    {
      label: 'Toggle notifications',
      value: 'settings-notifications',
      group: 'Preferences',
    },
    {
      label: 'Toggle dark mode',
      value: 'settings-theme',
      group: 'Preferences',
    },
  ],
}

function NestedMenus() {
  const { exit } = useApp()
  const [submenu, setSubmenu] = React.useState<string | undefined>(undefined)

  if (!submenu) {
    return (
      <Box flexDirection="column">
        <Text dimColor>Select a category — Escape to quit:</Text>
        <EnhancedSelectInput
          items={rootItems}
          onSelect={(item) => {
            setSubmenu(item.value)
          }}
          onCancel={() => {
            exit()
          }}
        />
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{submenu} — Escape to go back</Text>
      <EnhancedSelectInput
        items={submenus[submenu] ?? []}
        onSelect={(item) => {
          console.log(`Selected: ${item.value}`)
          exit()
        }}
        onCancel={() => {
          setSubmenu(undefined)
        }}
      />
    </Box>
  )
}

render(<NestedMenus />)
