import test from 'ava'
import { Box, Text } from 'ink'
import { render } from 'ink-testing-library'
import React from 'react'
import { EnhancedSelectInput } from '../enhanced-select-input/index.js'

// ANSI escape sequences for arrow keys
const ARROW_UP = '\u001B[A'
const ARROW_DOWN = '\u001B[B'

// Small delay to let React/Ink process state updates
const delay = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

test('render with default options', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[
        {
          label: 'Item 1',
          value: 'item-1',
        },
        {
          label: 'Item 2',
          value: 'item-2',
          disabled: true,
        },
        {
          label: 'Item 3',
          value: 'item-3',
        },
      ]}
    />
  )

  const lastFrameSnapshot = lastFrame()
  t.snapshot(lastFrameSnapshot)
  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('Item 1'))
    t.true(lastFrameSnapshot.includes('Item 2'))
    t.true(lastFrameSnapshot.includes('Item 3'))

    // Snapshot should contain 3 lines
    t.is(lastFrameSnapshot.split('\n').length, 3)
  } else {
    t.fail('basic snapshot is empty')
  }
})

test('render with horizontal orientation', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      orientation="horizontal"
      items={[
        {
          label: 'Item 1',
          value: 'item-1',
        },
        {
          label: 'Item 2',
          value: 'item-2',
          disabled: true,
        },
        {
          label: 'Item 3',
          value: 'item-3',
        },
      ]}
    />
  )

  const lastFrameSnapshot = lastFrame()
  t.snapshot(lastFrameSnapshot)
  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('Item 1'))
    t.true(lastFrameSnapshot.includes('Item 2'))
    t.true(lastFrameSnapshot.includes('Item 3'))

    // Horizontal snapshot should contain 1 line
    t.is(lastFrameSnapshot.split('\n').length, 1)
  } else {
    t.fail('horizontal snapshot is empty')
  }
})

test('render with custom hotkeys', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[
        {
          label: 'Item 1',
          value: 'item-1',
          hotkey: '1',
        },
        {
          label: 'Item 2',
          value: 'item-2',
          hotkey: 'b',
        },
      ]}
    />
  )

  const lastFrameSnapshot = lastFrame()
  t.snapshot(lastFrameSnapshot)
  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('(1)'))
    t.true(lastFrameSnapshot.includes('(b)'))
  } else {
    t.fail('hotkeys snapshot is empty')
  }
})

test('render with custom indicators on each item', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={[
        {
          label: 'Item 1',
          value: 'item-1',
          indicator: '•',
        },
      ]}
    />
  )

  const lastFrameSnapshot = lastFrame()
  t.snapshot(lastFrameSnapshot)
  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('•'))
    t.true(lastFrameSnapshot.includes('Item 1'))
  } else {
    t.fail('indicators snapshot is empty')
  }
})

test('render with custom item component', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput
      itemComponent={({ isSelected, label, isDisabled }) => (
        <Box>
          <Text color={isDisabled ? 'gray' : isSelected ? 'yellow' : 'white'}>
            {`${isSelected ? `Selected ${label}` : `Not Selected ${label}`}`}
          </Text>
        </Box>
      )}
      items={[
        {
          label: 'Item 1',
          value: 'item-1',
        },
        {
          label: 'Item 2',
          value: 'item-2',
          disabled: true,
        },
      ]}
    />
  )

  const lastFrameSnapshot = lastFrame()
  t.snapshot(lastFrameSnapshot)

  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('Selected'))
    t.true(lastFrameSnapshot.includes('Item 1'))
  } else {
    t.fail('custom item component snapshot is empty')
  }
})

// --- limit prop pagination ---

test('limit restricts visible items', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput items={items} limit={2} />
  )

  const frame = lastFrame()!
  // Only 2 items should be visible initially
  t.is(frame.split('\n').length, 2)
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
  t.false(frame.includes('C'))
  t.false(frame.includes('D'))
})

test('limit scrolls to show items beyond the initial window', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      limit={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  // Move to B
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'B')

  // Move to C — should scroll the window
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'C')

  const frame = lastFrame()!
  // Window should now show C and D
  t.true(frame.includes('C'))
  t.true(frame.includes('D'))
})

test('limit scrolls backward when navigating up', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      limit={2}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  // Move up to B — should scroll window back
  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'B')

  const frame = lastFrame()!
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
})

test('limit wraps around from last item to first', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      limit={2}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  // Wrap around to A
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'A')

  const frame = lastFrame()!
  t.true(frame.includes('A'))
})
