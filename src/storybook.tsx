#!/usr/bin/env node
import { Box, Text, render, useApp } from 'ink'
import React from 'react'
import { EnhancedSelectInput } from './enhanced-select-input/index.js'

type StorybookView = 'hotkeys' | 'custom-indicators' | 'custom-item' | undefined

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
            // OnHighlight={(item) => console.log(item)}
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
            // OnHighlight={(item) => console.log(item)}
            orientation={orientation}
            items={[
              {
                label: 'View Hotkeys',
                value: 'hotkeys',
              },
              {
                label: 'Custom Indicators',
                value: 'custom-indicators',
              },
              {
                label: 'Custom Item Component',
                value: 'custom-item',
              },
              {
                label: 'Disabled Item',
                value: 'disabled-item',
                disabled: true,
              },
              {
                label: 'Go Back',
                value: 'back',
                hotkey: 'b',
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'hotkeys') {
                setCurrentView('hotkeys')
              }

              if (item.value === 'custom-indicators') {
                setCurrentView('custom-indicators')
              }

              if (item.value === 'custom-item') {
                setCurrentView('custom-item')
              }

              if (item.value === 'back') {
                setOrientation(undefined)
              }
            }}
          />
        </Box>
      )}

      {currentView === 'custom-indicators' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Item Specific Custom Indicators View:</Text>
          <EnhancedSelectInput
            // OnHighlight={(item) => console.log(item)}
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
              }

              if (item.value === 'hotkeys') {
                setCurrentView('hotkeys')
              }

              if (item.value === 'custom-item') {
                setCurrentView('custom-item')
              }
            }}
          />
        </Box>
      )}

      {currentView === 'custom-item' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Custom Item and Indicator Component View:</Text>
          <EnhancedSelectInput
            // OnHighlight={(item) => console.log(item)}
            itemComponent={({ isSelected, isDisabled, label }) => (
              <Box>
                <Text
                  color={isSelected ? 'blue' : isDisabled ? 'gray' : 'white'}
                >
                  {label}
                </Text>
              </Box>
            )}
            indicatorComponent={({ isSelected, item }) => (
              <Text color={isSelected ? 'blue' : 'white'}>
                {isSelected ? '→ ' : (item.indicator ?? '  ')}
              </Text>
            )}
            orientation={orientation}
            items={[
              {
                label: 'View Hotkeys',
                value: 'hotkeys',
              },
              {
                label: 'View Custom Indicators',
                value: 'indicators',
              },
              {
                label: 'View Custom Item Component',
                value: 'custom-item',
                disabled: true,
              },
              {
                label: 'Go Back',
                value: 'back',
                hotkey: 'b',
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setCurrentView(undefined)
              }

              if (item.value === 'hotkeys') {
                setCurrentView('hotkeys')
              }

              if (item.value === 'indicators') {
                setCurrentView('custom-indicators')
              }
            }}
          />
        </Box>
      )}

      {currentView === 'hotkeys' && orientation && (
        <Box flexDirection="column">
          <Text dimColor>Hotkeys View:</Text>
          <EnhancedSelectInput
            // OnHighlight={(item) => console.log(item)}
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
              {
                label: 'Go Back',
                value: 'back',
                hotkey: 'b',
              },
            ]}
            onSelect={(item) => {
              if (item.value === 'back') {
                setCurrentView(undefined)
              }

              if (item.value === 'hotkeys') {
                setCurrentView('hotkeys')
              }

              if (item.value === 'custom-indicators') {
                setCurrentView('custom-indicators')
              }

              if (item.value === 'custom-item') {
                setCurrentView('custom-item')
              }
            }}
          />
        </Box>
      )}
    </Box>
  )
}

render(<Storybook />)
