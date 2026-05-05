#!/usr/bin/env node
import { Box, Text, render, useApp } from 'ink'
import React from 'react'
import { EnhancedSelectInput } from './enhanced-select-input/index.js'

type StorybookView =
  | 'hotkeys'
  | 'custom-indicators'
  | 'custom-item'
  | 'groups'
  | 'multi-select'
  | 'searchable'
  | 'scroll-indicators'
  | undefined

export function Storybook() {
  const { exit } = useApp()
  const [orientation, setOrientation] = React.useState<
    'horizontal' | 'vertical' | undefined
  >(undefined)

  const [currentView, setCurrentView] = React.useState<StorybookView>()

  return (
    <Box
      borderDimColor
      flexDirection="column"
      gap={1}
      borderStyle="round"
      paddingX={2}
      paddingTop={1}
      paddingBottom={1}
    >
      <Box gap={2}>
        <Text color="green">Enhanced Select Input Storybook ⌱</Text>
        <Text dimColor>mode: {orientation ?? 'n/a'}</Text>
      </Box>

      {!orientation && (
        <>
          <Text dimColor>Select a variant:</Text>
          <EnhancedSelectInput
            orientation={orientation}
            items={[
              {
                label: 'Vertical',
                value: 'vertical',
                indicator: <Text color="cyan">⎸</Text>,
                hotkey: 'v',
              },
              {
                label: 'Horizontal',
                value: 'horizontal',
                indicator: <Text color="cyan">⎼</Text>,
                hotkey: 'h',
              },
              {
                label: 'Exit',
                value: 'exit',
                indicator: <Text color="red">⏍</Text>,
                hotkey: 'x',
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'exit') {
                exit()
              }

              setOrientation(item.value as 'horizontal' | 'vertical')
            }}
          />
        </>
      )}

      {!currentView && orientation && (
        <Box flexDirection="column">
          <EnhancedSelectInput
            orientation={orientation}
            items={[
              { label: 'Hotkeys', value: 'hotkeys', group: 'Classic' },
              {
                label: 'Custom Indicators',
                value: 'custom-indicators',
                group: 'Classic',
              },
              {
                label: 'Custom Item Component',
                value: 'custom-item',
                group: 'Classic',
              },
              {
                label: 'Item Groups',
                value: 'groups',
                group: 'New in 1.0',
              },
              {
                label: 'Multi-Select',
                value: 'multi-select',
                group: 'New in 1.0',
              },
              {
                label: 'Searchable',
                value: 'searchable',
                group: 'New in 1.0',
              },
              {
                label: 'Scroll Indicators',
                value: 'scroll-indicators',
                group: 'New in 1.0',
              },
              {
                label: 'Disabled Item',
                value: 'disabled-item',
                disabled: true,
              },
              { label: 'Go Back', value: 'back', hotkey: 'b' },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setOrientation(undefined)
                return
              }

              setCurrentView(item.value as StorybookView)
            }}
          />
        </Box>
      )}

      {currentView === 'groups' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Item Groups — items grouped under headers:</Text>
          <EnhancedSelectInput
            orientation={orientation}
            items={[
              { label: 'TypeScript', value: 'ts', group: 'Languages' },
              { label: 'Rust', value: 'rust', group: 'Languages' },
              { label: 'Go', value: 'go', group: 'Languages' },
              { label: 'React', value: 'react', group: 'Frameworks' },
              { label: 'Ink', value: 'ink', group: 'Frameworks' },
              { label: 'Go Back', value: 'back', hotkey: 'b' },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setCurrentView(undefined)
              }
            }}
          />
        </Box>
      )}

      {currentView === 'multi-select' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>
            Multi-Select — Space to toggle, Enter to confirm:
          </Text>
          <EnhancedSelectInput
            multiple
            orientation={orientation}
            defaultSelectedKeys={['ts']}
            items={[
              { label: 'TypeScript', value: 'ts' },
              { label: 'React', value: 'react' },
              { label: 'Ink', value: 'ink' },
              { label: 'Node.js', value: 'node' },
              {
                label: 'Legacy (unavailable)',
                value: 'legacy',
                disabled: true,
              },
            ]}
            onConfirm={(items) => {
              console.log('Confirmed:', items.map((i) => i.label).join(', '))
            }}
            onCancel={() => {
              setCurrentView(undefined)
            }}
          />
        </Box>
      )}

      {currentView === 'searchable' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Searchable — type to filter items:</Text>
          <EnhancedSelectInput
            searchable
            orientation={orientation}
            searchPlaceholder="Filter languages..."
            items={[
              { label: 'TypeScript', value: 'ts' },
              { label: 'JavaScript', value: 'js' },
              { label: 'Rust', value: 'rust' },
              { label: 'Go', value: 'go' },
              { label: 'Python', value: 'python' },
              { label: 'Ruby', value: 'ruby' },
              { label: 'Java', value: 'java' },
              { label: 'C++', value: 'cpp' },
            ]}
            onSelect={(item) => {
              console.log('Selected:', item.label)
            }}
            onCancel={() => {
              setCurrentView(undefined)
            }}
          />
        </Box>
      )}

      {currentView === 'scroll-indicators' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Scroll Indicators — limit=3 with ▲/▼ counts:</Text>
          <EnhancedSelectInput
            showScrollIndicators
            orientation={orientation}
            limit={3}
            items={[
              { label: 'Alpha', value: 'a' },
              { label: 'Bravo', value: 'b' },
              { label: 'Charlie', value: 'c' },
              { label: 'Delta', value: 'd' },
              { label: 'Echo', value: 'e' },
              { label: 'Foxtrot', value: 'f' },
              { label: 'Golf', value: 'g' },
              { label: 'Hotel', value: 'h' },
            ]}
            onSelect={(item) => {
              console.log('Selected:', item.label)
            }}
            onCancel={() => {
              setCurrentView(undefined)
            }}
          />
        </Box>
      )}

      {currentView === 'custom-indicators' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Item Specific Custom Indicators View:</Text>
          <EnhancedSelectInput
            orientation={orientation}
            items={[
              {
                label: 'Hotkeys',
                value: 'hotkeys',
                indicator: <Text color="green">✔</Text>,
              },
              {
                label: 'Custom Item Component',
                value: 'custom-item',
                indicator: <Text color="red">✘</Text>,
              },
              {
                label: 'Custom Indicators',
                value: 'custom-indicators',
                disabled: true,
                indicator: <Text color="gray">-</Text>,
              },
              {
                label: 'Go Back',
                value: 'back',
                hotkey: 'b',
                indicator: <Text color="yellow">←</Text>,
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setCurrentView(undefined)
              } else {
                setCurrentView(item.value as StorybookView)
              }
            }}
          />
        </Box>
      )}

      {currentView === 'custom-item' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Custom Item and Indicator Component View:</Text>
          <EnhancedSelectInput
            itemComponent={({ isSelected, isDisabled, label }) => (
              <Box>
                <Text
                  color={isSelected ? 'blue' : isDisabled ? 'gray' : 'white'}
                >
                  {label}
                </Text>
              </Box>
            )}
            indicatorComponent={({ isSelected, item }) => {
              const icon = item.indicator ?? '  '
              return (
                <Text color={isSelected ? 'blue' : 'white'}>
                  {isSelected ? '→ ' : icon}
                </Text>
              )
            }}
            orientation={orientation}
            items={[
              { label: 'View Hotkeys', value: 'hotkeys' },
              { label: 'View Custom Indicators', value: 'indicators' },
              {
                label: 'View Custom Item Component',
                value: 'custom-item',
                disabled: true,
              },
              { label: 'Go Back', value: 'back', hotkey: 'b' },
            ]}
            onSelect={(item) => {
              switch (item.value) {
                case 'back': {
                  setCurrentView(undefined)
                  break
                }

                case 'hotkeys': {
                  setCurrentView('hotkeys')
                  break
                }

                case 'indicators': {
                  setCurrentView('custom-indicators')
                  break
                }

                default: {
                  break
                }
              }
            }}
          />
        </Box>
      )}

      {currentView === 'hotkeys' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Hotkeys View:</Text>
          <EnhancedSelectInput
            orientation={orientation}
            items={[
              {
                label: 'Hotkeys',
                value: 'hotkeys',
                hotkey: 'h',
                disabled: true,
              },
              {
                label: 'Custom Indicators',
                value: 'custom-indicators',
                hotkey: 'i',
              },
              {
                label: 'Custom Item Component',
                value: 'custom-item',
                hotkey: 'c',
              },
              { label: 'Go Back', value: 'back', hotkey: 'b' },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setCurrentView(undefined)
              } else {
                setCurrentView(item.value as StorybookView)
              }
            }}
          />
        </Box>
      )}
    </Box>
  )
}

render(<Storybook />)
