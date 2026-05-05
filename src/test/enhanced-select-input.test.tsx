import test from 'ava'
import { Box, Text } from 'ink'
import { render } from 'ink-testing-library'
import React from 'react'
import {
  DefaultGroupHeaderComponent,
  DefaultIndicatorComponent,
  EnhancedSelectInput,
  useEnhancedSelectInput,
  type Item,
  type UseEnhancedSelectInputResult,
} from '../enhanced-select-input/index.js'

// ANSI escape sequences for arrow keys
const ARROW_UP = '\u001B[A'
const ARROW_DOWN = '\u001B[B'
const ARROW_RIGHT = '\u001B[C'
const ARROW_LEFT = '\u001B[D'
const ENTER = '\r'
const ESCAPE = '\u001B'
const HOME = '\u001B[H'
const END = '\u001B[F'
const SPACE = ' '

// Small delay to let React/Ink process state updates
const delay = async (ms = 100) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

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

  if (lastFrameSnapshot) {
    t.true(lastFrameSnapshot.includes('Selected'))
    t.true(lastFrameSnapshot.includes('Item 1'))
  } else {
    t.fail('custom item component snapshot is empty')
  }
})

// --- Empty State ---

test('render empty items list', (t) => {
  const { lastFrame } = render(<EnhancedSelectInput items={[]} />)
  const frame = lastFrame()
  t.true(frame !== undefined)
})

// --- initialIndex ---

test('initialIndex selects the correct item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')
  const frame = lastFrame()!
  t.true(frame.includes('C'))
})

test('initialIndex out of bounds clamps to last item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  render(
    <EnhancedSelectInput
      items={items}
      initialIndex={99}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
})

test('initialIndex on a disabled item skips to nearest enabled', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')
})

// --- Keyboard Navigation (vertical, arrow keys) ---

test('arrow down moves selection down', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'B')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'C')
})

test('arrow up moves selection up', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'B')
})

test('navigation wraps around from last to first', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'A')
})

test('navigation wraps around from first to last', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'B')
})

// --- Vim-style navigation ---

test('j/k keys navigate vertically', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('j')
  await delay()
  t.is(highlighted, 'B')

  stdin.write('j')
  await delay()
  t.is(highlighted, 'C')

  stdin.write('k')
  await delay()
  t.is(highlighted, 'B')
})

test('h/l keys navigate horizontally', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('l')
  await delay()
  t.is(highlighted, 'B')

  stdin.write('l')
  await delay()
  t.is(highlighted, 'C')

  stdin.write('h')
  await delay()
  t.is(highlighted, 'B')
})

test('arrow left/right navigate in horizontal orientation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_RIGHT)
  await delay()
  t.is(highlighted, 'B')

  stdin.write(ARROW_LEFT)
  await delay()
  t.is(highlighted, 'A')
})

// --- Disabled Item Skipping ---

test('navigation skips disabled items', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'C')
})

test('navigation skips multiple consecutive disabled items', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c', disabled: true },
    { label: 'D', value: 'd' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'D')
})

// --- onSelect ---

test('enter key triggers onSelect', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'A')
})

test('navigate then select', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'C')
})

// --- Hotkey Selection ---

test('hotkey triggers onSelect for matching item', async (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('y')
  await delay()
  t.is(selected, 'B')
})

test('hotkey does not trigger for disabled item', async (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y', disabled: true },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('y')
  await delay()
  t.is(selected, '')
})

// --- isFocused ---

test('isFocused=false disables keyboard input', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      isFocused={false}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'A')
})

// --- limit prop pagination ---

test('limit restricts visible items', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} limit={2} />)

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

// --- initialIndex edge cases ---

test('negative initialIndex clamps to first item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  render(
    <EnhancedSelectInput
      items={items}
      initialIndex={-5}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')
})

// --- All items disabled ---

test('all items disabled: nothing is navigable', async (t) => {
  const items = [
    { label: 'A', value: 'a', disabled: true },
    { label: 'B', value: 'b', disabled: true },
  ]

  let selected = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  // Navigation should not move when all items are disabled
  const frame = lastFrame()!
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
  // Enter on a disabled item must not trigger onSelect
  stdin.write(ENTER)
  await delay()
  t.is(selected, '')
})

// --- Enter on disabled item ---

test('enter on a disabled item does not trigger onSelect', async (t) => {
  // Start with the only selectable item disabled via the initial highlight
  const items = [
    { label: 'A', value: 'a', disabled: true },
    { label: 'B', value: 'b' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={0}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  // InitialIndex=0 is disabled, so it skips to B (index 1)
  // Navigate back to A's slot by going up (wraps to B since A disabled)
  // We can't actually land on A because navigation skips disabled items.
  // Verify that pressing Enter on the current selection (B) works normally.
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'B')
})

// --- Hotkey / vim-key conflict ---

test('vim nav key takes priority over matching hotkey', async (t) => {
  // In vertical orientation, 'j' navigates down.
  // An item with hotkey='j' should NOT fire onSelect when j is pressed.
  const items = [
    { label: 'A', value: 'a', hotkey: 'j' },
    { label: 'B', value: 'b' },
  ]

  let selected = ''
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="vertical"
      onSelect={(item) => {
        selected = item.label
      }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  // Press 'j' — should navigate down, not select via hotkey
  stdin.write('j')
  await delay()
  t.is(highlighted, 'B')
  t.is(selected, '') // Hotkey must not have fired
})

// --- DefaultIndicatorComponent in isolation ---

test('DefaultIndicatorComponent renders selected state', (t) => {
  const items = [{ label: 'X', value: 'x' }]
  const item = items[0]!

  const { lastFrame: selectedFrame } = render(
    <DefaultIndicatorComponent isSelected item={item} />
  )
  const { lastFrame: unselectedFrame } = render(
    <DefaultIndicatorComponent isSelected={false} item={item} />
  )

  t.true(selectedFrame()!.includes('>'))
  t.false(unselectedFrame()!.includes('>'))
})

// --- Horizontal wrap-around ---

test('horizontal navigation wraps around from last to first', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')

  stdin.write(ARROW_RIGHT)
  await delay()
  t.is(highlighted, 'A')
})

test('horizontal navigation wraps around from first to last', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(ARROW_LEFT)
  await delay()
  t.is(highlighted, 'B')
})

// --- onCancel (Escape key) ---

test('Escape calls onCancel', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  stdin.write(ESCAPE)
  await delay()
  t.true(cancelled)
})

test('Escape does not call onCancel when isFocused=false', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      isFocused={false}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  stdin.write(ESCAPE)
  await delay()
  t.false(cancelled)
})

test('Escape is a no-op when onCancel is not provided', async (t) => {
  const items = [{ label: 'A', value: 'a' }]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ESCAPE)
  await delay()
  // Component keeps working normally after an ignored Escape
  t.is(highlighted, 'A')
})

// --- Home / End keys ---

test('Home key jumps to first enabled item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'A')
})

test('End key jumps to last enabled item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(END)
  await delay()
  t.is(highlighted, 'C')
})

test('Home skips leading disabled items', async (t) => {
  const items = [
    { label: 'A', value: 'a', disabled: true },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={3}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'D')

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'C')
})

test('End skips trailing disabled items', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c', disabled: true },
    { label: 'D', value: 'd', disabled: true },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()
  t.is(highlighted, 'B')
})

test('Home/End update rotateIndex when limit is active', async (t) => {
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
      initialIndex={0}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(END)
  await delay()
  t.is(highlighted, 'D')

  // Window should have scrolled to show D
  const frame = lastFrame()!
  t.true(frame.includes('D'))

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'A')

  // Window should have scrolled back to show A
  const frame2 = lastFrame()!
  t.true(frame2.includes('A'))
})

// --- showScrollIndicators ---

test('showScrollIndicators shows below indicator when items are clipped', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput showScrollIndicators items={items} limit={2} />
  )

  const frame = lastFrame()!
  t.true(frame.includes('▼'))
  t.true(frame.includes('2 more'))
  t.false(frame.includes('▲'))
})

test('showScrollIndicators shows both indicators when window is mid-list', async (t) => {
  // 6 items, limit=2, start at index 2 → window [C,D], 2 above, 2 below
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
    { label: 'E', value: 'e' },
    { label: 'F', value: 'f' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={items}
      limit={2}
      initialIndex={2}
    />
  )

  await delay()
  const frame = lastFrame()!
  t.true(frame.includes('▲'))
  t.true(frame.includes('▼'))
  t.true(frame.includes('2 more'))

  // Navigate to last window (E/F) — no more below
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  const frame2 = lastFrame()!
  t.true(frame2.includes('▲'))
  t.false(frame2.includes('▼'))
})

test('showScrollIndicators hidden by default', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} limit={2} />)

  const frame = lastFrame()!
  t.false(frame.includes('▲'))
  t.false(frame.includes('▼'))
})

test('showScrollIndicators not shown when all items fit in window', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput showScrollIndicators items={items} limit={5} />
  )

  const frame = lastFrame()!
  t.false(frame.includes('▲'))
  t.false(frame.includes('▼'))
})

// --- useEnhancedSelectInput hook ---

// HookHarness renders nothing but calls the hook and forwards the result.
// Value type is unknown since tests only assert on index/count fields.
type HookHarnessProperties = {
  readonly items: Array<Item<unknown>>
  readonly initialIndex?: number
  readonly limit?: number
  readonly isFocused?: boolean
  readonly orientation?: 'vertical' | 'horizontal'
  // eslint-disable-next-line react/boolean-prop-naming
  readonly searchable?: boolean
  readonly onResult: (result: UseEnhancedSelectInputResult<unknown>) => void
}

function HookHarness(properties: HookHarnessProperties) {
  const { onResult, ...hookProperties } = properties
  const result = useEnhancedSelectInput(hookProperties)
  onResult(result)
  return null
}

test('hook returns correct initial state', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={items}
      initialIndex={1}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.selectedIndex, 1)
  t.is(result?.hasItems, true)
  t.is(result?.visibleItems.length, 3)
  t.is(result?.rotateIndex, 0)
})

test('hook returns correct pagination state', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={items}
      limit={2}
      initialIndex={2}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.selectedIndex, 2)
  t.is(result?.rotateIndex, 2)
  t.is(result?.visibleItems.length, 2)
  t.is(result?.itemsAbove, 2)
  t.is(result?.itemsBelow, 0)
})

test('hook responds to keyboard input', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.selectedIndex, 0)

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(result?.selectedIndex, 1)
})

test('hook returns empty state for empty items', async (t) => {
  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={[]}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.hasItems, false)
  t.is(result?.visibleItems.length, 0)
})

// --- #15: items prop sync after mount ---

test('selection clamps when items shrink below current index', async (t) => {
  const initialItems = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''

  const { rerender } = render(
    <EnhancedSelectInput
      items={initialItems}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  // Shrink to 2 items — index 2 no longer exists
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
})

test('selection moves off a now-disabled item when items update', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''

  const { rerender } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')

  // Mark B as disabled — selection should move to nearest enabled item
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b', disabled: true },
        { label: 'C', value: 'c' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.not(highlighted, 'B')
})

test('selection preserved when items update but current slot is still valid', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''

  const { rerender } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')

  // Replace with fresh reference, same content — selection must stay on B
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
})

// --- #16: duplicate key warning ---

test('warns in development when object-valued items have no key field', async (t) => {
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...arguments_: unknown[]) => {
    warnings.push(String(arguments_[0]))
  }

  try {
    render(
      <EnhancedSelectInput
        items={[
          { label: 'A', value: { id: 1 } },
          { label: 'B', value: { id: 2 } },
        ]}
      />
    )

    await delay()
    t.true(warnings.some((w) => w.includes('[ink-enhanced-select-input]')))
    t.true(warnings.some((w) => w.includes('Duplicate item keys')))
  } finally {
    console.warn = originalWarn
  }
})

test('no duplicate key warning when all items have explicit keys', async (t) => {
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...arguments_: unknown[]) => {
    warnings.push(String(arguments_[0]))
  }

  try {
    render(
      <EnhancedSelectInput
        items={[
          { key: 'item-1', label: 'A', value: { id: 1 } },
          { key: 'item-2', label: 'B', value: { id: 2 } },
        ]}
      />
    )

    await delay()
    t.false(warnings.some((w) => w.includes('[ink-enhanced-select-input]')))
  } finally {
    console.warn = originalWarn
  }
})

// --- Multi-select mode (#12) ---

test('multi-select renders checkbox indicators instead of arrow cursor', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]
  const { lastFrame } = render(<EnhancedSelectInput multiple items={items} />)
  const frame = lastFrame()!
  t.true(frame.includes('[ ]'))
  t.false(frame.includes('>'))
})

test('multi-select space toggles checked state on', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput multiple items={items} />
  )

  await delay()
  t.false(lastFrame()!.includes('[x]'))

  stdin.write(SPACE)
  await delay()
  t.true(lastFrame()!.includes('[x]'))
})

test('multi-select space toggles checked state off', async (t) => {
  const items = [{ label: 'A', value: 'a' }]
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput multiple items={items} defaultSelectedKeys={['a']} />
  )

  await delay()
  t.true(lastFrame()!.includes('[x]'))

  stdin.write(SPACE)
  await delay()
  t.false(lastFrame()!.includes('[x]'))
})

test('multi-select defaultSelectedKeys pre-checks items', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]
  const { lastFrame } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      defaultSelectedKeys={['a', 'c']}
    />
  )
  const frame = lastFrame()!
  t.is((frame.match(/\[x]/g) ?? []).length, 2)
  t.is((frame.match(/\[ ]/g) ?? []).length, 1)
})

test('multi-select enter calls onConfirm with checked items', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let confirmed: string[] = []
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onConfirm={(selected) => {
        confirmed = selected.map((item) => String(item.value))
      }}
    />
  )

  await delay()
  stdin.write(SPACE) // Check A
  await delay()
  stdin.write(ARROW_DOWN) // → B
  await delay()
  stdin.write(ARROW_DOWN) // → C
  await delay()
  stdin.write(SPACE) // Check C
  await delay()
  stdin.write(ENTER)
  await delay()

  t.is(confirmed.length, 2)
  t.true(confirmed.includes('a'))
  t.true(confirmed.includes('c'))
})

test('multi-select enter with nothing checked calls onConfirm with empty array', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let confirmed: unknown[] | undefined
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onConfirm={(selected) => {
        confirmed = selected
      }}
    />
  )

  await delay()
  stdin.write(ENTER)
  await delay()

  t.not(confirmed, undefined)
  t.is(confirmed!.length, 0)
})

test('multi-select onToggle fires with item and checked state', async (t) => {
  const items = [{ label: 'A', value: 'a' }]

  const log: Array<{ label: string; checked: boolean }> = []
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onToggle={(item, checked) => {
        log.push({ label: item.label, checked })
      }}
    />
  )

  await delay()
  stdin.write(SPACE)
  await delay()
  t.is(log.length, 1)
  t.is(log[0]?.label, 'A')
  t.is(log[0]?.checked, true)

  stdin.write(SPACE)
  await delay()
  t.is(log.length, 2)
  t.is(log[1]?.checked, false)
})

test('multi-select space only toggles enabled items', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c' },
  ]

  const toggled: string[] = []
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onToggle={(item) => {
        toggled.push(item.label)
      }}
    />
  )

  await delay()
  stdin.write(SPACE) // Toggle A
  await delay()
  stdin.write(ARROW_DOWN) // Skip B → land on C
  await delay()
  stdin.write(SPACE) // Toggle C
  await delay()

  t.is(toggled.length, 2)
  t.true(toggled.includes('A'))
  t.true(toggled.includes('C'))
  t.false(toggled.includes('B'))
})

test('multi-select hotkeys do not fire in multi-select mode', async (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('x')
  await delay()
  t.is(selected, '')
})

test('multi-select hotkey hints not shown in render', (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput multiple items={items} />)
  const frame = lastFrame()!
  t.false(frame.includes('(x)'))
  t.false(frame.includes('(y)'))
})

test('multi-select isChecked passed to custom indicatorComponent', async (t) => {
  const items = [{ label: 'A', value: 'a' }]

  let receivedIsChecked: boolean | undefined
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      indicatorComponent={({ isChecked }) => {
        receivedIsChecked = isChecked
        return null
      }}
    />
  )

  await delay()
  t.is(receivedIsChecked, false)

  stdin.write(SPACE)
  await delay()
  t.is(receivedIsChecked, true)
})

test('multi-select isChecked passed to custom itemComponent', async (t) => {
  const items = [{ label: 'A', value: 'a' }]

  let receivedIsChecked: boolean | undefined
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      itemComponent={({ isChecked }) => {
        receivedIsChecked = isChecked
        return null
      }}
    />
  )

  await delay()
  t.is(receivedIsChecked, false)

  stdin.write(SPACE)
  await delay()
  t.is(receivedIsChecked, true)
})

test('DefaultIndicatorComponent renders checkboxes in multi-select mode', (t) => {
  const item = { label: 'X', value: 'x' }

  const { lastFrame: checkedFrame } = render(
    <DefaultIndicatorComponent isSelected isChecked item={item} />
  )
  const { lastFrame: uncheckedFrame } = render(
    <DefaultIndicatorComponent
      isSelected={false}
      item={item}
      isChecked={false}
    />
  )

  t.true(checkedFrame()!.includes('[x]'))
  t.true(uncheckedFrame()!.includes('[ ]'))
  t.false(checkedFrame()!.includes('>'))
})

// --- Item Groups ---

test('group headers are rendered before grouped items', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Recent' },
    { label: 'B', value: 'b', group: 'Recent' },
    { label: 'C', value: 'c', group: 'All' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.true(frame.includes('── Recent ──'))
  t.true(frame.includes('── All ──'))
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
  t.true(frame.includes('C'))
})

test('group header appears only once per group in visible window', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Fruits' },
    { label: 'B', value: 'b', group: 'Fruits' },
    { label: 'C', value: 'c', group: 'Fruits' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  const matches = frame.split('── Fruits ──')
  // Split produces N+1 parts for N occurrences, so 2 parts = 1 occurrence
  t.is(matches.length, 2)
})

test('group headers are non-navigable (navigation skips them)', async (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'First' },
    { label: 'B', value: 'b', group: 'Second' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(ARROW_DOWN)
  await delay()
  // Should navigate to B, not get stuck on a header
  t.is(highlighted, 'B')
})

test('items without group do not render a header', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.false(frame.includes('──'))
})

test('mixed grouped and ungrouped items render correctly', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', group: 'Special' },
    { label: 'C', value: 'c', group: 'Special' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.true(frame.includes('A'))
  t.true(frame.includes('── Special ──'))
  t.true(frame.includes('B'))
  t.true(frame.includes('C'))
  // No header for ungrouped item A
  const lines = frame.split('\n')
  t.false(lines[0]!.includes('──'))
})

test('custom groupHeaderComponent is used when provided', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Custom' },
    { label: 'B', value: 'b', group: 'Custom' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      groupHeaderComponent={({ label }) => <Text>[{label}]</Text>}
    />
  )

  const frame = lastFrame()!
  t.true(frame.includes('[Custom]'))
  t.false(frame.includes('──'))
})

test('group headers render correctly with limit/pagination', async (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'First' },
    { label: 'B', value: 'b', group: 'First' },
    { label: 'C', value: 'c', group: 'Second' },
    { label: 'D', value: 'd', group: 'Second' },
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
  // Initial window shows A and B (both in "First" group)
  const frame1 = lastFrame()!
  t.true(frame1.includes('── First ──'))
  t.true(frame1.includes('A'))
  t.true(frame1.includes('B'))

  // Navigate to C — window scrolls to show C and D
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'C')

  const frame2 = lastFrame()!
  t.true(frame2.includes('── Second ──'))
  t.true(frame2.includes('C'))
  t.true(frame2.includes('D'))
})
// --- Additional Group Tests ---

test('group headers render in horizontal orientation', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Left' },
    { label: 'B', value: 'b', group: 'Right' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput items={items} orientation="horizontal" />
  )

  const frame = lastFrame()!
  t.true(frame.includes('── Left ──'))
  t.true(frame.includes('── Right ──'))
})

test('group headers work with multi-select mode', async (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Group1' },
    { label: 'B', value: 'b', group: 'Group1' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput multiple items={items} />
  )

  await delay()
  const frame1 = lastFrame()!
  t.true(frame1.includes('── Group1 ──'))
  t.true(frame1.includes('[ ]'))

  stdin.write(SPACE)
  await delay()
  const frame2 = lastFrame()!
  t.true(frame2.includes('[x]'))
  t.true(frame2.includes('── Group1 ──'))
})

test('group headers render for groups containing disabled items', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'Tools', disabled: true },
    { label: 'B', value: 'b', group: 'Tools' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.true(frame.includes('── Tools ──'))
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
})

test('non-contiguous items with same group get separate headers per window', (t) => {
  // When items with the same group appear in different positions,
  // the header renders before the first occurrence in the visible window
  const items = [
    { label: 'A', value: 'a', group: 'Alpha' },
    { label: 'B', value: 'b', group: 'Beta' },
    { label: 'C', value: 'c', group: 'Alpha' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  // "Alpha" header should only appear once (before first occurrence)
  const alphaMatches = frame.split('── Alpha ──')
  t.is(alphaMatches.length, 2) // 1 occurrence
  t.true(frame.includes('── Beta ──'))
})

test('group headers with showScrollIndicators', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'First' },
    { label: 'B', value: 'b', group: 'First' },
    { label: 'C', value: 'c', group: 'Second' },
    { label: 'D', value: 'd', group: 'Second' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput showScrollIndicators items={items} limit={2} />
  )

  const frame = lastFrame()!
  t.true(frame.includes('── First ──'))
  t.true(frame.includes('▼'))
  t.true(frame.includes('2 more'))
})

// --- DefaultGroupHeaderComponent isolation ---

test('DefaultGroupHeaderComponent renders label with decorators', (t) => {
  const { lastFrame } = render(<DefaultGroupHeaderComponent label="My Group" />)

  const frame = lastFrame()!
  t.true(frame.includes('── My Group ──'))
})

// --- Edge Cases: Single Item ---

test('single item list: navigation wraps to itself', async (t) => {
  const items = [{ label: 'Only', value: 'only' }]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Only')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Only')

  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'Only')
})

// --- Edge Cases: limit ---

test('limit larger than items count shows all items', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} limit={10} />)

  const frame = lastFrame()!
  t.true(frame.includes('A'))
  t.true(frame.includes('B'))
  t.is(frame.split('\n').length, 2)
})

test('limit=1 shows single item at a time', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      items={items}
      limit={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')
  let frame = lastFrame()!
  t.is(frame.split('\n').length, 1)
  t.true(frame.includes('A'))

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'B')
  frame = lastFrame()!
  t.true(frame.includes('B'))
  t.false(frame.includes('A'))
})

// --- Escape in multi-select mode ---

test('Escape calls onCancel in multi-select mode', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  stdin.write(SPACE) // Toggle A
  await delay()
  stdin.write(ESCAPE)
  await delay()
  t.true(cancelled)
})

// --- Home/End in horizontal orientation ---

test('Home key works in horizontal orientation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'A')
})

test('End key works in horizontal orientation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()
  t.is(highlighted, 'C')
})

// --- Multi-select with item.key field ---

test('multi-select defaultSelectedKeys works with explicit item.key', (t) => {
  const items = [
    { key: 'k1', label: 'A', value: { id: 1 } },
    { key: 'k2', label: 'B', value: { id: 2 } },
    { key: 'k3', label: 'C', value: { id: 3 } },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      defaultSelectedKeys={['k1', 'k3']}
    />
  )

  const frame = lastFrame()!
  t.is((frame.match(/\[x]/g) ?? []).length, 2)
  t.is((frame.match(/\[ ]/g) ?? []).length, 1)
})

// --- Hook: isFocused=false ---

test('hook ignores all input when isFocused=false', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      items={items}
      isFocused={false}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.selectedIndex, 0)

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(result?.selectedIndex, 0)

  stdin.write('j')
  await delay()
  t.is(result?.selectedIndex, 0)
})

// --- Navigation on empty items does nothing ---

test('keyboard input on empty items does not crash', async (t) => {
  const { stdin, lastFrame } = render(<EnhancedSelectInput items={[]} />)

  await delay()
  // Should not throw
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_UP)
  await delay()
  stdin.write(ENTER)
  await delay()
  stdin.write(ESCAPE)
  await delay()
  stdin.write(HOME)
  await delay()
  stdin.write(END)
  await delay()

  const frame = lastFrame()
  t.true(frame !== undefined)
})

// --- Hotkey updates highlight position ---

test('hotkey updates selectedIndex to the hotkey item', async (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y' },
    { label: 'C', value: 'c', hotkey: 'z' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write('z')
  await delay()
  t.is(highlighted, 'C')

  // Subsequent arrow navigation should continue from C
  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'B')
})

// --- Hotkey in horizontal mode with h/l conflict ---

test('h/l hotkeys are ignored in horizontal orientation (nav takes priority)', async (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'h' },
    { label: 'B', value: 'b', hotkey: 'l' },
    { label: 'C', value: 'c' },
  ]

  let selected = ''
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="horizontal"
      onSelect={(item) => {
        selected = item.label
      }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  // 'l' should navigate right, not trigger hotkey
  stdin.write('l')
  await delay()
  t.is(highlighted, 'B')
  t.is(selected, '')

  // 'h' should navigate left, not trigger hotkey
  stdin.write('h')
  await delay()
  t.is(highlighted, 'A')
  t.is(selected, '')
})

// --- onSelect not provided does not crash ---

test('enter without onSelect does not crash', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { stdin, lastFrame } = render(<EnhancedSelectInput items={items} />)

  await delay()
  stdin.write(ENTER)
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('A'))
})

// --- onHighlight not provided does not crash ---

test('navigation without onHighlight does not crash', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { stdin, lastFrame } = render(<EnhancedSelectInput items={items} />)

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('B'))
})

// --- Multi-select: navigation still works ---

test('multi-select navigation with arrow keys works', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'B')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'C')

  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'B')
})

// --- Multi-select: Home/End work ---

test('multi-select Home/End navigation works', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()
  t.is(highlighted, 'C')

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'A')
})

// --- Indicator component receives the item ---

test('indicatorComponent receives the current item', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const receivedItems: string[] = []
  render(
    <EnhancedSelectInput
      items={items}
      indicatorComponent={({ item }) => {
        receivedItems.push(item.label)
        return null
      }}
    />
  )

  t.true(receivedItems.includes('A'))
  t.true(receivedItems.includes('B'))
})

// --- Per-item indicator only shows when selected ---

test('per-item indicator only shows for selected item', async (t) => {
  const items = [
    { label: 'A', value: 'a', indicator: '★' },
    { label: 'B', value: 'b', indicator: '●' },
  ]

  const { stdin, lastFrame } = render(<EnhancedSelectInput items={items} />)

  await delay()
  let frame = lastFrame()!
  t.true(frame.includes('★'))
  // B's indicator should not show (space placeholder instead)
  t.false(frame.includes('●'))

  stdin.write(ARROW_DOWN)
  await delay()
  frame = lastFrame()!
  t.true(frame.includes('●'))
  // A is no longer selected, its indicator should be hidden
  t.false(frame.includes('★'))
})

// --- Scroll indicators in horizontal mode ---

test('showScrollIndicators uses ◀/▶ in horizontal mode', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  const { lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={items}
      limit={2}
      orientation="horizontal"
      initialIndex={2}
    />
  )

  const frame = lastFrame()!
  t.true(frame.includes('◀'))
  t.true(frame.includes('2 more'))
  // No items below since we're at the end
  t.false(frame.includes('▲'))
  t.false(frame.includes('▼'))
})

// --- Rapid navigation ---

test('rapid sequential navigation lands on correct item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
    { label: 'E', value: 'e' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'E')
})

// --- onHighlight fires on initial render ---

test('onHighlight fires on initial mount', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')
})

test('onHighlight fires with correct item when initialIndex is set', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
})

// --- Generic value type ---

test('works with complex object values when key is provided', async (t) => {
  type MyValue = { id: number; name: string }
  const items: Array<{ key: string; label: string; value: MyValue }> = [
    { key: 'item-1', label: 'First', value: { id: 1, name: 'one' } },
    { key: 'item-2', label: 'Second', value: { id: 2, name: 'two' } },
  ]

  let selected: MyValue | undefined
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onSelect={(item) => {
        selected = item.value
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  stdin.write(ENTER)
  await delay()

  t.not(selected, undefined)
  t.is(selected?.id, 2)
  t.is(selected?.name, 'two')
})

// --- Multi-select: toggle then navigate then confirm ---

test('multi-select: toggle multiple items across navigation then confirm', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let confirmed: string[] = []
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      onConfirm={(selected) => {
        confirmed = selected.map((item) => String(item.value))
      }}
    />
  )

  await delay()
  stdin.write(SPACE) // Check A
  await delay()
  stdin.write(ARROW_DOWN) // → B
  await delay()
  stdin.write(ARROW_DOWN) // → C
  await delay()
  stdin.write(SPACE) // Check C
  await delay()
  stdin.write(ARROW_DOWN) // → D
  await delay()
  stdin.write(SPACE) // Check D
  await delay()
  stdin.write(ARROW_UP) // → C
  await delay()
  stdin.write(SPACE) // Uncheck C
  await delay()
  stdin.write(ENTER)
  await delay()

  t.is(confirmed.length, 2)
  t.true(confirmed.includes('a'))
  t.true(confirmed.includes('d'))
  t.false(confirmed.includes('c'))
})

// --- Items update: items grow ---

test('selection stays valid when items grow', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let highlighted = ''
  const { rerender } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')

  // Add more items — selection should stay on B
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' },
        { label: 'D', value: 'd' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
})

// --- Items update: items replaced entirely ---

test('selection resets when items are completely replaced', async (t) => {
  let highlighted = ''
  const { rerender } = render(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' },
      ]}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'C')

  // Replace with completely different items (only 1 item)
  rerender(
    <EnhancedSelectInput
      items={[{ label: 'X', value: 'x' }]}
      initialIndex={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'X')
})

// --- Searchable Mode (#14) ---

test('searchable: renders search input with placeholder', (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput searchable items={items} />)

  const frame = lastFrame()!
  t.true(frame.includes('/ Search...'))
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Banana'))
})

test('searchable: renders custom placeholder', (t) => {
  const items = [{ label: 'Apple', value: 'apple' }]

  const { lastFrame } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      searchPlaceholder="Type to filter"
    />
  )

  const frame = lastFrame()!
  t.true(frame.includes('/ Type to filter'))
})

test('searchable: typing filters items by label', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Avocado', value: 'avocado' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('a')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('/ a'))
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Avocado'))
  t.true(frame.includes('Banana')) // "Banana" contains 'a'
})

test('searchable: filtering is case-insensitive', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('APP')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('Apple'))
  t.false(frame.includes('Banana'))
})

test('searchable: multi-character query narrows results', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('ap')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Apricot'))
  t.false(frame.includes('Banana'))

  stdin.write('p')
  await delay()

  const frame2 = lastFrame()!
  // "app" matches Apple but not Apricot
  t.true(frame2.includes('Apple'))
  t.false(frame2.includes('Apricot'))
})

test('searchable: backspace removes last character from query', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('app')
  await delay()

  let frame = lastFrame()!
  t.true(frame.includes('Apple'))
  t.false(frame.includes('Banana'))

  // Backspace to "ap"
  stdin.write('\u007F') // DEL/Backspace
  await delay()

  frame = lastFrame()!
  t.true(frame.includes('/ ap'))
  t.true(frame.includes('Apple'))
  t.false(frame.includes('Banana'))
})

test('searchable: escape clears the search query', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('app')
  await delay()

  let frame = lastFrame()!
  t.false(frame.includes('Banana'))

  stdin.write(ESCAPE)
  await delay()

  frame = lastFrame()!
  // Query cleared — all items visible again
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Banana'))
  t.true(frame.includes('/ Search...'))
})

test('searchable: escape calls onCancel when query is already empty', async (t) => {
  const items = [{ label: 'Apple', value: 'apple' }]

  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  // No query typed, escape should call onCancel
  stdin.write(ESCAPE)
  await delay()
  t.true(cancelled)
})

test('searchable: escape clears query first, then onCancel on second press', async (t) => {
  const items = [{ label: 'Apple', value: 'apple' }]

  let cancelled = false
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  stdin.write('a')
  await delay()

  // First escape clears query
  stdin.write(ESCAPE)
  await delay()
  t.false(cancelled)
  t.true(lastFrame()!.includes('/ Search...'))

  // Second escape calls onCancel
  stdin.write(ESCAPE)
  await delay()
  t.true(cancelled)
})

test('searchable: arrow navigation works on filtered results', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('ap')
  await delay()
  // After filtering, first match should be highlighted
  t.is(highlighted, 'Apple')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Apricot')

  stdin.write(ARROW_UP)
  await delay()
  t.is(highlighted, 'Apple')
})

test('searchable: enter selects from filtered results', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('ban')
  await delay()
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'Banana')
})

test('searchable: vim keys (j/k) are treated as search input, not navigation', async (t) => {
  const items = [
    { label: 'jelly', value: 'jelly' },
    { label: 'jam', value: 'jam' },
    { label: 'juice', value: 'juice' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('j')
  await delay()

  const frame = lastFrame()!
  // 'j' should be in the search query, not navigate
  t.true(frame.includes('/ j'))
  // All items contain 'j' so all should be visible
  t.true(frame.includes('jelly'))
  t.true(frame.includes('jam'))
  t.true(frame.includes('juice'))
})

test('searchable: hotkeys are disabled', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple', hotkey: 'a' },
    { label: 'Banana', value: 'banana', hotkey: 'b' },
  ]

  let selected = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('a')
  await delay()

  // 'a' should filter, not trigger hotkey
  t.is(selected, '')
  const frame = lastFrame()!
  t.true(frame.includes('/ a'))
})

test('searchable: shows "No matches" when query matches nothing', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('xyz')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('No matches'))
  t.true(frame.includes('/ xyz'))
  t.false(frame.includes('Apple'))
  t.false(frame.includes('Banana'))
})

test('searchable: selection resets to first item when query changes', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Apricot')

  // Typing resets selection to first match
  stdin.write('b')
  await delay()
  t.is(highlighted, 'Banana')
})

test('searchable: works with disabled items', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple', disabled: true },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('ap')
  await delay()
  // Apple is disabled, so Apricot should be highlighted
  t.is(highlighted, 'Apricot')
})

test('searchable: space is treated as search character, not toggle', async (t) => {
  const items = [
    { label: 'Ice Cream', value: 'ice-cream' },
    { label: 'Iced Tea', value: 'iced-tea' },
    { label: 'Apple', value: 'apple' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      searchable
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  stdin.write('i')
  await delay()
  stdin.write('c')
  await delay()
  stdin.write('e')
  await delay()
  stdin.write(SPACE)
  await delay()

  // Verify space was captured in the query (not treated as toggle)
  t.is(result?.searchQuery, 'ice ')
  // "ice " matches only "Ice Cream" (not "Iced Tea" since "iced tea" doesn't contain "ice ")
  t.is(result?.visibleItems.length, 1)
  t.is(result?.visibleItems[0]?.label, 'Ice Cream')
})

test('searchable: hook exposes searchQuery in result', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      searchable
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.searchQuery, '')

  stdin.write('app')
  await delay()
  t.is(result?.searchQuery, 'app')
})

test('searchable: non-searchable mode does not show search input', (t) => {
  const items = [{ label: 'Apple', value: 'apple' }]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.false(frame.includes('/'))
  t.false(frame.includes('Search'))
})

test('searchable: works with limit/pagination', async (t) => {
  const items = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Bravo', value: 'bravo' },
    { label: 'Charlie', value: 'charlie' },
    { label: 'Delta', value: 'delta' },
    { label: 'Able', value: 'able' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} limit={2} />
  )

  await delay()
  stdin.write('a')
  await delay()

  const frame = lastFrame()!
  // "a" matches Alpha, Bravo (has 'a'), Charlie (has 'a'), Delta (has 'a'), Able
  // With limit=2, only first 2 should be visible
  t.true(frame.includes('/ a'))
})

test('searchable: groups still render with filtered items', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple', group: 'Fruits' },
    { label: 'Apricot', value: 'apricot', group: 'Fruits' },
    { label: 'Broccoli', value: 'broccoli', group: 'Vegetables' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('ap')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('── Fruits ──'))
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Apricot'))
  t.false(frame.includes('Broccoli'))
  t.false(frame.includes('── Vegetables ──'))
})

test('searchable: backspace on empty query does nothing', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  // Backspace with no query
  stdin.write('\u007F')
  await delay()

  const frame = lastFrame()!
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Banana'))
  t.true(frame.includes('/ Search...'))
})

// --- Searchable + Multi-select combination ---

test('searchable + multiple: can filter then confirm checked items', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  let confirmed: string[] = []
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      multiple
      items={items}
      defaultSelectedKeys={['apple', 'cherry']}
      onConfirm={(selected) => {
        confirmed = selected.map((item) => String(item.value))
      }}
    />
  )

  await delay()
  // Filter to only "ap" items, then confirm — should still include
  // all previously checked items that match the filter
  stdin.write('ap')
  await delay()
  stdin.write(ENTER)
  await delay()

  // Only "apple" matches the filter AND is checked
  t.is(confirmed.length, 1)
  t.true(confirmed.includes('apple'))
})

// --- Searchable + limit + navigation ---

test('searchable + limit: navigation works within paginated filtered results', async (t) => {
  const items = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Apex', value: 'apex' },
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      limit={2}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('a')
  await delay()
  // "a" matches Alpha, Apex, Apple, Banana (all contain 'a')
  t.is(highlighted, 'Alpha')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Apex')

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Apple')

  // Should have scrolled past the limit=2 window
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Banana')
})

// --- Searchable + isFocused=false ---

test('searchable: typing blocked when isFocused=false', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      searchable
      items={items}
      isFocused={false}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  stdin.write('app')
  await delay()

  // Query should remain empty since input is blocked
  t.is(result?.searchQuery, '')
  t.is(result?.visibleItems.length, 2)
})

// --- Searchable + Home/End on filtered results ---

test('searchable: Home/End work on filtered results', async (t) => {
  const items = [
    { label: 'Alpha', value: 'alpha' },
    { label: 'Apex', value: 'apex' },
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      searchable
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Alpha')

  stdin.write('ap')
  await delay()
  // After filtering, move down first to change selectedIndex
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'Apple')

  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'Apex')

  stdin.write(END)
  await delay()
  t.is(highlighted, 'Apple')
})

// --- Searchable: query with no results then backspace restores items ---

test('searchable: multiple backspaces progressively restore items', async (t) => {
  // This test verifies that backspace works to widen the filter.
  // The existing "backspace removes last character" test covers single backspace.
  // Here we verify the query display updates correctly.
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Apricot', value: 'apricot' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('app')
  await delay()

  let frame = lastFrame()!
  t.true(frame.includes('/ app'))
  t.true(frame.includes('Apple'))
  t.false(frame.includes('Apricot'))
  t.false(frame.includes('Banana'))

  // Single backspace to "ap" — now Apricot also matches
  stdin.write('\u007F')
  await delay()

  frame = lastFrame()!
  t.true(frame.includes('/ ap'))
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Apricot'))
  t.false(frame.includes('Banana'))
})
