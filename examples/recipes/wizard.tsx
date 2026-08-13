// Sequential wizard flow — 3 `EnhancedSelectInput` steps driven by local
// `step` state. `onCancel` (Escape) steps back one screen, mirroring the
// `setCurrentView(undefined)` "go back" pattern in src/storybook.tsx.
// Run: node --loader ts-node/esm examples/recipes/wizard.tsx
import React from 'react'
import { Box, render, Text, useApp } from 'ink'
import { EnhancedSelectInput } from '../../src/enhanced-select-input/index.js'

type Answers = {
  projectType?: string
  language?: string
}

function Wizard() {
  const { exit } = useApp()
  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState<Answers>({})

  const goBack = () => {
    if (step === 0) {
      console.log('Cancelled')
      exit()
      return
    }

    setStep((s) => s - 1)
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>Step {step + 1} of 3 — Escape to go back</Text>

      {step === 0 && (
        <EnhancedSelectInput
          items={[
            { label: 'Library', value: 'library' },
            { label: 'CLI', value: 'cli' },
            { label: 'App', value: 'app' },
          ]}
          onSelect={(item) => {
            setAnswers((a) => ({ ...a, projectType: item.value }))
            setStep(1)
          }}
          onCancel={goBack}
        />
      )}

      {step === 1 && (
        <EnhancedSelectInput
          items={[
            { label: 'TypeScript', value: 'ts' },
            { label: 'JavaScript', value: 'js' },
          ]}
          onSelect={(item) => {
            setAnswers((a) => ({ ...a, language: item.value }))
            setStep(2)
          }}
          onCancel={goBack}
        />
      )}

      {step === 2 && (
        <EnhancedSelectInput
          items={[
            { label: 'npm', value: 'npm' },
            { label: 'yarn', value: 'yarn' },
            { label: 'pnpm', value: 'pnpm' },
          ]}
          onSelect={(item) => {
            console.log('Wizard complete:', {
              ...answers,
              packageManager: item.value,
            })
            exit()
          }}
          onCancel={goBack}
        />
      )}
    </Box>
  )
}

render(<Wizard />)
