import test from 'ava'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import React from 'react'
import {
  DefaultGroupHeaderComponent,
  DefaultIndicatorComponent,
  DefaultItemComponent,
  EnhancedSelectInput,
  type GroupHeaderProperties,
  type IndicatorProperties,
  type ItemProperties,
} from '../enhanced-select-input/index.js'

// Small delay to let React/Ink process state updates.
const delay = async (ms = 300) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

// `process.env.NO_COLOR = undefined` stringifies to the literal `"undefined"`
// instead of clearing the variable — restore by deleting when the original
// value was actually unset.
function restoreNoColor(original: string | undefined) {
  if (original === undefined) {
    // eslint-disable-next-line n/prefer-global/process
    delete process.env['NO_COLOR']
  } else {
    // eslint-disable-next-line n/prefer-global/process
    process.env['NO_COLOR'] = original
  }
}

// Renders EnhancedSelectInput with an itemComponent that serializes the
// resolved theme it receives, so tests can assert on theme *values* rather
// than on chalk-rendered ANSI escapes — Ink only invokes chalk when `color`
// is truthy or `dimColor` is true (see ink's Text component), so asserting
// the resolved theme fields feeding those props is an equivalent, and more
// environment-robust, check than pattern-matching escape codes (whose
// presence in `lastFrame()` also depends on chalk's own color-level
// detection, which this test environment does not force on by default).
function CapturingItem({ label, isDisabled, theme }: ItemProperties) {
  return (
    <Text>
      {`${label}|${String(theme?.selected)}|${String(theme?.disabled)}|${String(
        theme?.dim
      )}|${isDisabled}`}
    </Text>
  )
}

function CapturingIndicator({ isSelected, theme }: IndicatorProperties) {
  return <Text>{`indicator:${isSelected}:${String(theme?.selected)}`}</Text>
}

function CapturingGroupHeader({ label, theme }: GroupHeaderProperties) {
  return (
    <Text>{`header:${label}:${String(theme?.groupHeader)}:${String(
      theme?.dim
    )}`}</Text>
  )
}

test('theme: default (no override, no NO_COLOR) matches original hard-coded colors', async (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple' }]}
      itemComponent={CapturingItem}
    />
  )
  await delay()
  t.true(lastFrame()?.includes('Apple|green|gray|true|false'))
})

test('theme: custom selected color overrides only that slot', async (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple' }]}
      itemComponent={CapturingItem}
      theme={{ selected: 'magenta' }}
    />
  )
  await delay()
  // `disabled` keeps its default ('gray') — only `selected` was overridden.
  t.true(lastFrame()?.includes('Apple|magenta|gray|true|false'))
})

test('theme: custom disabled color applies to disabled items', async (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple', disabled: true }]}
      itemComponent={CapturingItem}
      theme={{ disabled: 'red' }}
    />
  )
  await delay()
  t.true(lastFrame()?.includes('Apple|green|red|true|true'))
})

test.serial(
  'theme: NO_COLOR collapses every color to undefined and disables dim, overriding any custom theme',
  async (t) => {
    // eslint-disable-next-line n/prefer-global/process
    const original = process.env['NO_COLOR']
    // eslint-disable-next-line n/prefer-global/process
    process.env['NO_COLOR'] = '1'
    try {
      const { lastFrame } = render(
        <EnhancedSelectInput
          items={[{ label: 'Apple', value: 'apple' }]}
          itemComponent={CapturingItem}
          theme={{ selected: 'magenta', disabled: 'red' }}
        />
      )
      await delay()
      t.true(lastFrame()?.includes('Apple|undefined|undefined|false|false'))
    } finally {
      restoreNoColor(original)
    }
  }
)

test.serial(
  'theme: NO_COLOR="" (empty string) does not disable color, per the NO_COLOR spec',
  async (t) => {
    // eslint-disable-next-line n/prefer-global/process
    const original = process.env['NO_COLOR']
    // eslint-disable-next-line n/prefer-global/process
    process.env['NO_COLOR'] = ''
    try {
      const { lastFrame } = render(
        <EnhancedSelectInput
          items={[{ label: 'Apple', value: 'apple' }]}
          itemComponent={CapturingItem}
        />
      )
      await delay()
      t.true(lastFrame()?.includes('Apple|green|gray|true|false'))
    } finally {
      restoreNoColor(original)
    }
  }
)

test('theme: indicatorComponent receives the resolved theme', async (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple' }]}
      indicatorComponent={CapturingIndicator}
      theme={{ selected: 'cyan' }}
    />
  )
  await delay()
  t.true(lastFrame()?.includes('indicator:true:cyan'))
})

test('theme: groupHeaderComponent receives the resolved theme', async (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple', group: 'Fruits' }]}
      groupHeaderComponent={CapturingGroupHeader}
      theme={{ groupHeader: 'blue' }}
    />
  )
  await delay()
  t.true(lastFrame()?.includes('header:Fruits:blue:true'))
})

test('theme: standalone DefaultItemComponent falls back to defaults when theme prop is omitted', (t) => {
  const { lastFrame } = render(
    <DefaultItemComponent isSelected label="Standalone" isDisabled={false} />
  )
  t.true(lastFrame()?.includes('Standalone'))
})

test('theme: standalone DefaultIndicatorComponent falls back to defaults when theme prop is omitted', (t) => {
  const { lastFrame } = render(
    <DefaultIndicatorComponent isSelected item={{ label: 'x', value: 'x' }} />
  )
  t.true(lastFrame()?.includes('>'))
})

test('theme: standalone DefaultGroupHeaderComponent falls back to defaults when theme prop is omitted', (t) => {
  const { lastFrame } = render(<DefaultGroupHeaderComponent label="Fruits" />)
  t.true(lastFrame()?.includes('── Fruits ──'))
})
