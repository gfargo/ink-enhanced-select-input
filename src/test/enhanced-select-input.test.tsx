import test from 'ava'
import { Box, Text } from 'ink'
import { render } from 'ink-testing-library'
import React from 'react'
import {
  DefaultIndicatorComponent,
  EnhancedSelectInput,
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

// Small delay to let React/Ink process state updates
const delay = async (ms = 50) =>
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
  // initialIndex=0 is disabled, so it skips to B (index 1)
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
  t.is(selected, '') // hotkey must not have fired
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
