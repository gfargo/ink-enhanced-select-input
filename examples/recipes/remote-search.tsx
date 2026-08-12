// `searchable` combined with a simulated remote fetch (`setTimeout` standing
// in for a network call) triggered on every query change via
// `onSearchChange` — the shape of a live package/branch/user search backed
// by an API. See readme.md's "Live/Async Search" section for the full
// contract, including the controlled-`searchQuery` variant.
// Run: node --loader ts-node/esm examples/recipes/remote-search.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import {
  EnhancedSelectInput,
  type Item,
} from '../../src/enhanced-select-input/index.js'

const catalog = [
  'typescript',
  'typeorm',
  'type-fest',
  'react',
  'react-dom',
  'redux',
  'rxjs',
  'rollup',
  'ramda',
  'remeda',
  'ink',
  'inquirer',
  'ioredis',
]

async function searchPackages(query: string): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase()
      resolve(q ? catalog.filter((name) => name.includes(q)) : catalog)
    }, 300)
  })
}

function Demo() {
  const { exit } = useApp()
  const [items, setItems] = React.useState<Array<Item<string>>>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadInitial() {
      const names = await searchPackages('')
      setItems(names.map((name) => ({ label: name, value: name })))
      setIsLoading(false)
    }

    void loadInitial()
  }, [])

  return (
    <Box flexDirection="column">
      <Text dimColor>Type to search the (simulated) npm registry:</Text>
      <EnhancedSelectInput
        searchable
        items={items}
        isLoading={isLoading}
        searchPlaceholder="Search packages..."
        searchDebounce={200}
        onSearchChange={async (query) => {
          setIsLoading(true)
          const names = await searchPackages(query)
          setItems(names.map((name) => ({ label: name, value: name })))
          setIsLoading(false)
        }}
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
