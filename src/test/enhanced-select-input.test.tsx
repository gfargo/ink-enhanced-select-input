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
const CTRL_X = '\u0018' // Ctrl+X
const ALT_X = '\u001Bx' // Alt+X
const CTRL_J = '\u000A' // Ctrl+J
const CTRL_K = '\u000B' // Ctrl+K
const CTRL_H = '\u0008' // Ctrl+H
const CTRL_L = '\u000C' // Ctrl+L
const CTRL_A = '\u0001' // Ctrl+A
const CTRL_E = '\u0005' // Ctrl+E
const CTRL_W = '\u0017' // Ctrl+W
const CTRL_U = '\u0015' // Ctrl+U

// Small delay to let React/Ink process state updates. AVA runs this file's
// ~150 tests concurrently, so the default needs enough margin that a busy
// event loop doesn't make an assertion race the state update it's checking.
const delay = async (ms = 300) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

// Ink 7 flushes a lone Escape byte asynchronously (it briefly buffers it in
// case more bytes follow, e.g. an arrow-key sequence), so state updates
// triggered by Escape can land after a fixed `delay()` under load. Poll
// instead of sleeping-and-hoping for those cases.
const waitFor = async (condition: () => boolean, timeout = 2000) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start >= timeout) return
    // eslint-disable-next-line no-await-in-loop
    await delay(20)
  }
}

test.serial('render with default options', (t) => {
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

test.serial('render with horizontal orientation', (t) => {
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

test.serial('render with custom hotkeys', (t) => {
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

test.serial('render with custom indicators on each item', (t) => {
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

test.serial('render with custom item component', (t) => {
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

test.serial('render empty items list', (t) => {
  const { lastFrame } = render(<EnhancedSelectInput items={[]} />)
  const frame = lastFrame()
  t.true(frame !== undefined)
})

// --- initialIndex ---

test.serial('initialIndex selects the correct item', async (t) => {
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

test.serial('initialIndex out of bounds clamps to last item', async (t) => {
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

test.serial(
  'initialIndex on a disabled item skips to nearest enabled',
  async (t) => {
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
  }
)

// --- Keyboard Navigation (vertical, arrow keys) ---

test.serial('arrow down moves selection down', async (t) => {
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

test.serial('arrow up moves selection up', async (t) => {
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

test.serial('navigation wraps around from last to first', async (t) => {
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

test.serial('navigation wraps around from first to last', async (t) => {
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

test.serial('j/k keys navigate vertically', async (t) => {
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

test.serial('h/l keys navigate horizontally', async (t) => {
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

test.serial(
  'arrow left/right navigate in horizontal orientation',
  async (t) => {
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
  }
)

// --- Disabled Item Skipping ---

test.serial('navigation skips disabled items', async (t) => {
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

test.serial(
  'navigation skips multiple consecutive disabled items',
  async (t) => {
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
  }
)

// --- onSelect ---

test.serial('enter key triggers onSelect', async (t) => {
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

test.serial('navigate then select', async (t) => {
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

test.serial('hotkey triggers onSelect for matching item', async (t) => {
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

test.serial('hotkey does not trigger for disabled item', async (t) => {
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

test('Ctrl+<letter> does not trigger a matching item hotkey', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'Danger', value: 'danger', hotkey: 'x' },
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
  stdin.write(CTRL_X)
  await delay()
  t.is(selected, '')
})

test('Alt+<letter> does not trigger a matching item hotkey', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'Danger', value: 'danger', hotkey: 'x' },
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
  stdin.write(ALT_X)
  await delay()
  t.is(selected, '')
})

// --- isFocused ---

test.serial('isFocused=false disables keyboard input', async (t) => {
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

test.serial('limit restricts visible items', (t) => {
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

test.serial(
  'limit scrolls to show items beyond the initial window',
  async (t) => {
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
  }
)

test.serial('limit scrolls backward when navigating up', async (t) => {
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

test.serial('limit wraps around from last item to first', async (t) => {
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

test.serial('negative initialIndex clamps to first item', async (t) => {
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

test.serial('all items disabled: nothing is navigable', async (t) => {
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

test.serial(
  'all items disabled: no selection cursor is rendered',
  async (t) => {
    const items = [
      { label: 'A', value: 'a', disabled: true },
      { label: 'B', value: 'b', disabled: true },
    ]

    const { lastFrame } = render(<EnhancedSelectInput items={items} />)

    await delay()
    // `resolveInitialIndex` lands on index 0 (the clamped fallback) since
    // nothing is enabled — render must not paint that as selected.
    t.false(lastFrame()!.includes('>'))
  }
)

test.serial(
  'all items disabled: Home/End do not move cursor or fire onHighlight',
  async (t) => {
    const items = [
      { label: 'A', value: 'a', disabled: true },
      { label: 'B', value: 'b', disabled: true },
    ]

    let highlightCount = 0
    const { stdin } = render(
      <EnhancedSelectInput
        items={items}
        onHighlight={() => {
          highlightCount++
        }}
      />
    )

    await delay()
    // Reset after initial mount highlight
    highlightCount = 0

    stdin.write(HOME)
    await delay()
    t.is(highlightCount, 0)

    stdin.write(END)
    await delay()
    t.is(highlightCount, 0)
  }
)

// --- Enter on disabled item ---

test.serial('enter on a disabled item does not trigger onSelect', async (t) => {
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

test.serial('vim nav key takes priority over matching hotkey', async (t) => {
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

test('Ctrl+J and Ctrl+K do not navigate in vertical orientation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      orientation="vertical"
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'A')

  stdin.write(CTRL_K)
  await delay()
  t.is(highlighted, 'A') // Ctrl+K must not navigate up/wrap

  stdin.write(CTRL_J)
  await delay()
  t.is(highlighted, 'A') // Ctrl+J must not navigate down
})

test('Ctrl+H and Ctrl+L do not navigate in horizontal orientation', async (t) => {
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
  t.is(highlighted, 'A')

  stdin.write(CTRL_L)
  await delay()
  t.is(highlighted, 'A') // Ctrl+L must not navigate right

  stdin.write(CTRL_H)
  await delay()
  t.is(highlighted, 'A') // Ctrl+H must not navigate left
})

// --- DefaultIndicatorComponent in isolation ---

test.serial('DefaultIndicatorComponent renders selected state', (t) => {
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

test.serial(
  'horizontal navigation wraps around from last to first',
  async (t) => {
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
  }
)

test.serial(
  'horizontal navigation wraps around from first to last',
  async (t) => {
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
  }
)

// --- onCancel (Escape key) ---

test.serial('Escape calls onCancel', async (t) => {
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
  await waitFor(() => cancelled)
  t.true(cancelled)
})

test.serial('Escape does not call onCancel when isFocused=false', async (t) => {
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

test.serial('Escape calls onCancel when items list is empty', async (t) => {
  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      items={[]}
      onCancel={() => {
        cancelled = true
      }}
    />
  )

  await delay()
  stdin.write(ESCAPE)
  await waitFor(() => cancelled)
  t.true(cancelled)
})

test.serial(
  'keyMap.cancel=false disables Escape → onCancel when items list is empty',
  async (t) => {
    let cancelled = false
    const { stdin } = render(
      <EnhancedSelectInput
        items={[]}
        keyMap={{ cancel: false }}
        onCancel={() => {
          cancelled = true
        }}
      />
    )

    await delay()
    stdin.write(ESCAPE)
    await delay()
    t.false(cancelled)
  }
)

test.serial('Escape is a no-op when onCancel is not provided', async (t) => {
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

test.serial('Home key jumps to first enabled item', async (t) => {
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

test.serial('End key jumps to last enabled item', async (t) => {
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

test.serial('Home skips leading disabled items', async (t) => {
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

test.serial('End skips trailing disabled items', async (t) => {
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

test.serial('Home/End update rotateIndex when limit is active', async (t) => {
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

test.serial(
  'showScrollIndicators shows below indicator when items are clipped',
  (t) => {
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
  }
)

test.serial(
  'showScrollIndicators shows both indicators when window is mid-list',
  async (t) => {
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
  }
)

test.serial('showScrollIndicators hidden by default', (t) => {
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

test.serial(
  'showScrollIndicators not shown when all items fit in window',
  (t) => {
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
  }
)

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
  // eslint-disable-next-line react/boolean-prop-naming
  readonly multiple?: boolean
  readonly onToggle?: (item: Item<unknown>, checked: boolean) => void
  readonly onResult: (result: UseEnhancedSelectInputResult<unknown>) => void
}

function HookHarness(properties: HookHarnessProperties) {
  const { onResult, ...hookProperties } = properties
  const result = useEnhancedSelectInput(hookProperties)
  onResult(result)
  return null
}

test.serial('hook returns correct initial state', async (t) => {
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

test.serial('hook returns correct pagination state', async (t) => {
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

test.serial('hook responds to keyboard input', async (t) => {
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

test.serial('hook returns empty state for empty items', async (t) => {
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
  t.is(result?.windowIndex, -1)
  t.is(result?.selectedItem, undefined)
})

// --- F13: headless hook ergonomics ---

test('hook returns windowIndex, selectedItem, and filteredItems', async (t) => {
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
  t.is(result?.windowIndex, 0)
  t.is(result?.selectedItem?.value, 'c')
  t.is(result?.filteredItems.length, 4)
})

test('windowIndex tracks navigation within a page', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined
  const { stdin } = render(
    <HookHarness
      items={items}
      limit={2}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.windowIndex, 0)
  t.is(result?.rotateIndex, 0)

  stdin.write(ARROW_DOWN)
  await delay()
  t.is(result?.selectedIndex, 1)
  t.is(result?.rotateIndex, 0)
  t.is(result?.windowIndex, 1)
})

test('setSelectedIndex moves selection and clamps out-of-range values', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  result?.setSelectedIndex(2)
  await waitFor(() => result?.selectedIndex === 2)
  t.is(result?.selectedIndex, 2)

  result?.setSelectedIndex(100)
  await waitFor(() => result?.selectedIndex === 2)
  t.is(result?.selectedIndex, 2)

  result?.setSelectedIndex(-5)
  await waitFor(() => result?.selectedIndex === 0)
  t.is(result?.selectedIndex, 0)
})

test('setSelectedIndex keeps the pagination window in sync when limit is set', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
    { label: 'D', value: 'd' },
    { label: 'E', value: 'e' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={items}
      limit={2}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  t.is(result?.rotateIndex, 0)
  t.is(result?.windowIndex, 0)

  // Jump to an index on a later page — the window should snap to the page
  // containing it, not stay put with an out-of-range windowIndex.
  result?.setSelectedIndex(3)
  await waitFor(() => result?.selectedIndex === 3)
  t.is(result?.rotateIndex, 2)
  t.is(result?.windowIndex, 1)
  t.deepEqual(
    result?.visibleItems.map((item) => item.value),
    ['c', 'd']
  )
  t.is(result?.visibleItems[result.windowIndex]?.value, 'd')

  // Jump back to the first page.
  result?.setSelectedIndex(0)
  await waitFor(() => result?.selectedIndex === 0)
  t.is(result?.rotateIndex, 0)
  t.is(result?.windowIndex, 0)
})

test('setSearchQuery filters items and resets selection', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Avocado', value: 'avocado' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      searchable
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  result?.setSelectedIndex(2)
  await waitFor(() => result?.selectedIndex === 2)
  t.is(result?.selectedIndex, 2)

  result?.setSearchQuery('a')
  await waitFor(() => result?.searchQuery === 'a')
  t.is(result?.searchQuery, 'a')
  t.is(result?.filteredItems.length, 3)
  t.is(result?.selectedIndex, 0)
})

test('toggle flips checked state of the highlighted item and a given item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const toggled: Array<[string, boolean]> = []
  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      multiple
      items={items}
      onToggle={(item, checked) => {
        toggled.push([String(item.value), checked])
      }}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  result?.toggle()
  await waitFor(() => Boolean(result?.checkedKeys.has('a')))
  t.true(result?.checkedKeys.has('a'))
  t.deepEqual(toggled.at(-1), ['a', true])

  result?.toggle(items[1])
  await waitFor(() => Boolean(result?.checkedKeys.has('b')))
  t.true(result?.checkedKeys.has('b'))
  t.deepEqual(toggled.at(-1), ['b', true])
})

test('toggle is a no-op outside multiple mode', async (t) => {
  const items = [{ label: 'A', value: 'a' }]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  result?.toggle()
  await delay()
  t.is(result?.checkedKeys.size, 0)

  result?.toggle(items[0])
  await delay()
  t.is(result?.checkedKeys.size, 0)
})

test('toggle is a no-op on disabled items in multiple mode', async (t) => {
  const items = [
    { label: 'A', value: 'a', disabled: true },
    { label: 'B', value: 'b' },
  ]

  let result: UseEnhancedSelectInputResult<unknown> | undefined

  render(
    <HookHarness
      multiple
      items={items}
      onResult={(r) => {
        result = r
      }}
    />
  )

  await delay()
  result?.toggle(items[0])
  await delay()
  t.is(result?.checkedKeys.size, 0)
})

// --- #15: items prop sync after mount ---

test.serial(
  'selection clamps when items shrink below current index',
  async (t) => {
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

    await waitFor(() => highlighted === 'B')
    t.is(highlighted, 'B')
  }
)

test.serial(
  'selection moves off a now-disabled item when items update',
  async (t) => {
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

    await waitFor(() => highlighted !== 'B')
    t.not(highlighted, 'B')
  }
)

test.serial(
  'selection preserved when items update but current slot is still valid',
  async (t) => {
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
  }
)

// --- #62: onHighlight refires on every parent re-render when the callback is inline ---

test('inline onHighlight is not re-invoked on parent re-renders with no highlight change', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]

  let callCount = 0

  function Wrapper({ tick }: { readonly tick: number }) {
    return (
      <Box>
        <Text>{tick}</Text>
        <EnhancedSelectInput
          items={items}
          onHighlight={() => {
            callCount++
          }}
        />
      </Box>
    )
  }

  const { rerender } = render(<Wrapper tick={0} />)
  await delay()
  t.is(callCount, 1)

  for (let tick = 1; tick <= 5; tick++) {
    rerender(<Wrapper tick={tick} />)
    // eslint-disable-next-line no-await-in-loop
    await delay()
  }

  t.is(callCount, 1)
})

test('setState inside onHighlight does not cause an infinite render loop', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  let callCount = 0

  function Wrapper() {
    const [tick, setTick] = React.useState(0)
    return (
      <Box>
        <Text>{tick}</Text>
        <EnhancedSelectInput
          items={items}
          onHighlight={() => {
            callCount++
            setTick((previous) => previous + 1)
          }}
        />
      </Box>
    )
  }

  render(<Wrapper />)
  await delay(300)

  t.is(callCount, 1)
})

test('onHighlight fires with the new item when its content changes at the same index', async (t) => {
  let highlighted = ''
  let callCount = 0

  const { rerender } = render(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
        callCount++
      }}
    />
  )

  await delay()
  t.is(highlighted, 'B')
  const callsAfterMount = callCount

  // Same length, same selectedIndex, but the item at index 1 now has
  // different content (and thus a different derived key) — onHighlight
  // must fire again with the new item rather than staying silent because
  // selectedIndex didn't change.
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B2', value: 'b2' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
        callCount++
      }}
    />
  )

  await waitFor(() => callCount > callsAfterMount)
  t.is(highlighted, 'B2')
})

test('onHighlight does not re-fire when items update with identical content', async (t) => {
  let callCount = 0
  // Stable reference across rerenders (like a memoized parent callback) so
  // this isolates the items-array-identity behaviour from onHighlight
  // identity, which is independently a dep of the effect.
  const onHighlight = () => {
    callCount++
  }

  const { rerender } = render(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]}
      initialIndex={1}
      onHighlight={onHighlight}
    />
  )

  await delay()
  const callsAfterMount = callCount
  t.true(callsAfterMount > 0)

  // Fresh array reference, identical content and keys — must not trigger
  // a spurious onHighlight call.
  rerender(
    <EnhancedSelectInput
      items={[
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]}
      initialIndex={1}
      onHighlight={onHighlight}
    />
  )

  await delay()
  t.is(callCount, callsAfterMount)
})

test('revalidation effect moves selection off an item that becomes disabled', async (t) => {
  let highlighted = ''

  const { rerender } = render(
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

  // The highlighted item (B, index 1) becomes disabled — the revalidation
  // effect must notice on the next filteredItems change and move the
  // selection to the nearest enabled item (C) rather than leaving
  // selectedIndex pointing at a now-disabled item.
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

  await waitFor(() => highlighted === 'C')
  t.is(highlighted, 'C')
})

test('revalidation effect resets selection when the highlighted item is filtered out', async (t) => {
  let highlighted = ''

  const { rerender } = render(
    <EnhancedSelectInput
      items={[
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Banana')

  // Shrinking the item set out from under a fixed initialIndex/selectedIndex
  // (no search involved) removes the previously highlighted item — the
  // revalidation effect must fall back to the nearest valid index instead
  // of reading past the end of the new array.
  rerender(
    <EnhancedSelectInput
      items={[{ label: 'Apple', value: 'apple' }]}
      initialIndex={1}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await waitFor(() => highlighted === 'Apple')
  t.is(highlighted, 'Apple')
})

// --- #16: duplicate key warning ---

// These two tests stub the shared console.warn and process.env['NODE_ENV'];
// run them serially so they don't stomp on each other's stub/restore when
// AVA executes the file's tests concurrently.
test.serial(
  'warns in development when object-valued items have no key field',
  async (t) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    // eslint-disable-next-line n/prefer-global/process
    const originalNodeEnv = process.env['NODE_ENV']
    console.warn = (...arguments_: unknown[]) => {
      warnings.push(String(arguments_[0]))
    }

    // The warning is gated on NODE_ENV !== 'production'; simulate a dev environment.
    // eslint-disable-next-line n/prefer-global/process
    process.env['NODE_ENV'] = 'development'

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

      // eslint-disable-next-line n/prefer-global/process
      process.env['NODE_ENV'] = originalNodeEnv
    }
  }
)

test.serial(
  'no duplicate key warning when all items have explicit keys',
  async (t) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    // eslint-disable-next-line n/prefer-global/process
    const originalNodeEnv = process.env['NODE_ENV']
    console.warn = (...arguments_: unknown[]) => {
      warnings.push(String(arguments_[0]))
    }

    // Run in development mode so the warning code path is active.
    // eslint-disable-next-line n/prefer-global/process
    process.env['NODE_ENV'] = 'development'

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

      // eslint-disable-next-line n/prefer-global/process
      process.env['NODE_ENV'] = originalNodeEnv
    }
  }
)

test.serial(
  'warns exactly once per distinct duplicate-key set across re-renders with a new-but-equivalent items array',
  async (t) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    // eslint-disable-next-line n/prefer-global/process
    const originalNodeEnv = process.env['NODE_ENV']
    console.warn = (...arguments_: unknown[]) => {
      warnings.push(String(arguments_[0]))
    }

    // eslint-disable-next-line n/prefer-global/process
    process.env['NODE_ENV'] = 'development'

    // A fresh inline array literal every call — same content, new reference —
    // mirrors a caller re-rendering with `items={[...]}` inline.
    const makeItems = () => [
      { label: 'A', value: { id: 1 } },
      { label: 'B', value: { id: 2 } },
    ]

    try {
      const { rerender } = render(<EnhancedSelectInput items={makeItems()} />)
      await delay()

      for (let index = 0; index < 4; index++) {
        rerender(<EnhancedSelectInput items={makeItems()} />)
        // eslint-disable-next-line no-await-in-loop
        await delay()
      }

      const duplicateWarnings = warnings.filter((w) =>
        w.includes('Duplicate item keys')
      )
      t.is(duplicateWarnings.length, 1)
    } finally {
      console.warn = originalWarn

      // eslint-disable-next-line n/prefer-global/process
      process.env['NODE_ENV'] = originalNodeEnv
    }
  }
)

// --- #44: item.indicator + multiple warning ---

// These two tests stub the global console.warn — run them serially so they
// don't race against each other (or other console.warn-stubbing tests) when
// AVA executes the file's tests concurrently.
test.serial(
  'warns in development when item.indicator is combined with multiple',
  async (t) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    // eslint-disable-next-line n/prefer-global/process
    const originalNodeEnv = process.env['NODE_ENV']
    console.warn = (...arguments_: unknown[]) => {
      warnings.push(String(arguments_[0]))
    }

    // The warning is gated on NODE_ENV !== 'production'; simulate a dev environment.
    // eslint-disable-next-line n/prefer-global/process
    process.env['NODE_ENV'] = 'development'

    try {
      render(
        <EnhancedSelectInput
          multiple
          items={[{ label: 'A', value: 'a', indicator: '★' }]}
        />
      )

      await delay()
      t.true(warnings.some((w) => w.includes('[ink-enhanced-select-input]')))
      t.true(warnings.some((w) => w.includes('item.indicator is ignored')))
    } finally {
      console.warn = originalWarn

      // eslint-disable-next-line n/prefer-global/process
      process.env['NODE_ENV'] = originalNodeEnv
    }
  }
)

test.serial('no item.indicator warning when multiple is false', async (t) => {
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...arguments_: unknown[]) => {
    warnings.push(String(arguments_[0]))
  }

  try {
    render(
      <EnhancedSelectInput
        items={[{ label: 'A', value: 'a', indicator: '★' }]}
      />
    )

    await delay()
    t.false(warnings.some((w) => w.includes('item.indicator is ignored')))
  } finally {
    console.warn = originalWarn
  }
})

test.serial(
  'item.indicator warning does not re-fire on re-render with an equivalent items array',
  async (t) => {
    const warnings: string[] = []
    const originalWarn = console.warn
    // eslint-disable-next-line n/prefer-global/process
    const originalNodeEnv = process.env['NODE_ENV']
    console.warn = (...arguments_: unknown[]) => {
      warnings.push(String(arguments_[0]))
    }

    // The warning is gated on NODE_ENV !== 'production'; simulate a dev environment.
    // eslint-disable-next-line n/prefer-global/process
    process.env['NODE_ENV'] = 'development'

    try {
      const { rerender } = render(
        <EnhancedSelectInput
          multiple
          items={[{ label: 'A', value: 'a', indicator: '★' }]}
        />
      )

      await delay()
      const firingsAfterMount = warnings.filter((w) =>
        w.includes('item.indicator is ignored')
      ).length
      t.true(firingsAfterMount > 0)

      // Re-render with a new array reference carrying identical content —
      // the derived boolean signal should stay the same, so the effect
      // should not fire again.
      rerender(
        <EnhancedSelectInput
          multiple
          items={[{ label: 'A', value: 'a', indicator: '★' }]}
        />
      )

      await delay()
      const firingsAfterRerender = warnings.filter((w) =>
        w.includes('item.indicator is ignored')
      ).length
      t.is(firingsAfterRerender, firingsAfterMount)
    } finally {
      console.warn = originalWarn

      // eslint-disable-next-line n/prefer-global/process
      process.env['NODE_ENV'] = originalNodeEnv
    }
  }
)

// Serial: this test's render triggers the item.indicator dev warning as a
// side effect, which would otherwise race the console.warn stubs above.
test.serial(
  'multi-select renders checkbox, not per-item indicator',
  async (t) => {
    const { lastFrame } = render(
      <EnhancedSelectInput
        multiple
        items={[{ label: 'A', value: 'a', indicator: '★' }]}
      />
    )

    await delay()
    const frame = lastFrame()!
    t.true(frame.includes('[ ]'))
    t.false(frame.includes('★'))
  }
)

// --- Multi-select mode (#12) ---

test.serial(
  'multi-select renders checkbox indicators instead of arrow cursor',
  (t) => {
    const items = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ]
    const { lastFrame } = render(<EnhancedSelectInput multiple items={items} />)
    const frame = lastFrame()!
    t.true(frame.includes('[ ]'))
    t.false(frame.includes('>'))
  }
)

test.serial('multi-select space toggles checked state on', async (t) => {
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

test.serial('multi-select space toggles checked state off', async (t) => {
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

test.serial('multi-select defaultSelectedKeys pre-checks items', (t) => {
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

test('multi-select defaultSelectedKeys ignores disabled items', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'Locked', value: 'locked', disabled: true },
  ]
  const { lastFrame } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      defaultSelectedKeys={['locked']}
    />
  )
  const frame = lastFrame()!
  t.false(frame.includes('[x]'))
  t.is((frame.match(/\[ ]/g) ?? []).length, 2)
})

test('multi-select onConfirm never includes a pre-checked disabled item', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'Locked', value: 'locked', disabled: true },
  ]

  let confirmed: string[] = []
  const { stdin } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      defaultSelectedKeys={['locked']}
      onConfirm={(selected) => {
        confirmed = selected.map((item) => String(item.value))
      }}
    />
  )

  await delay()
  stdin.write(ENTER)
  await delay()

  t.is(confirmed.length, 0)
})

test('multi-select defaultSelectedKeys pre-checks enabled items and drops disabled ones', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b', disabled: true },
    { label: 'C', value: 'c' },
  ]

  let confirmed: string[] = []
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      multiple
      items={items}
      defaultSelectedKeys={['a', 'b', 'c']}
      onConfirm={(selected) => {
        confirmed = selected.map((item) => String(item.value))
      }}
    />
  )

  await delay()
  const frame = lastFrame()!
  t.is((frame.match(/\[x]/g) ?? []).length, 2)
  t.is((frame.match(/\[ ]/g) ?? []).length, 1)

  stdin.write(ENTER)
  await delay()

  t.is(confirmed.length, 2)
  t.true(confirmed.includes('a'))
  t.true(confirmed.includes('c'))
})

test.serial(
  'multi-select enter calls onConfirm with checked items',
  async (t) => {
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
  }
)

test.serial(
  'multi-select enter with nothing checked calls onConfirm with empty array',
  async (t) => {
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
  }
)

test.serial(
  'multi-select space then enter in the same tick confirms the toggled item',
  async (t) => {
    const items = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
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
    stdin.write(ENTER) // Same tick, no await between the two writes
    await delay()

    t.is(confirmed.length, 1)
    t.true(confirmed.includes('a'))
  }
)

test.serial(
  'multi-select several toggles then enter in one tick confirms the final checked set',
  async (t) => {
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
    stdin.write(ENTER) // Same tick, no await between the two writes
    await delay()

    t.is(confirmed.length, 2)
    t.true(confirmed.includes('a'))
    t.true(confirmed.includes('c'))
  }
)

test.serial(
  'multi-select onToggle fires with item and checked state',
  async (t) => {
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
  }
)

test.serial('multi-select space only toggles enabled items', async (t) => {
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

test.serial(
  'multi-select hotkeys do not fire in multi-select mode',
  async (t) => {
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
  }
)

test.serial('multi-select hotkey hints not shown in render', (t) => {
  const items = [
    { label: 'A', value: 'a', hotkey: 'x' },
    { label: 'B', value: 'b', hotkey: 'y' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput multiple items={items} />)
  const frame = lastFrame()!
  t.false(frame.includes('(x)'))
  t.false(frame.includes('(y)'))
})

test.serial(
  'multi-select isChecked passed to custom indicatorComponent',
  async (t) => {
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
  }
)

test.serial(
  'multi-select isChecked passed to custom itemComponent',
  async (t) => {
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
  }
)

test.serial(
  'DefaultIndicatorComponent renders checkboxes in multi-select mode',
  (t) => {
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
  }
)

// --- Item Groups ---

test.serial('group headers are rendered before grouped items', (t) => {
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

test.serial(
  'group header appears only once per group in visible window',
  (t) => {
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
  }
)

test.serial(
  'group headers are non-navigable (navigation skips them)',
  async (t) => {
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
  }
)

test.serial('items without group do not render a header', (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]

  const { lastFrame } = render(<EnhancedSelectInput items={items} />)

  const frame = lastFrame()!
  t.false(frame.includes('──'))
})

test.serial('mixed grouped and ungrouped items render correctly', (t) => {
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

test.serial('custom groupHeaderComponent is used when provided', (t) => {
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

test.serial(
  'group headers render correctly with limit/pagination',
  async (t) => {
    const items = [
      { label: 'A', value: 'a', group: 'First' },
      { label: 'B', value: 'b', group: 'First' },
      { label: 'C', value: 'c', group: 'Second' },
      { label: 'D', value: 'd', group: 'Second' },
    ]

    // Limit counts rendered rows (items + headers), so a 2-item group needs
    // limit=3 to fit its header alongside both items in one page.
    let highlighted = ''
    const { stdin, lastFrame } = render(
      <EnhancedSelectInput
        items={items}
        limit={3}
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
  }
)
// --- Additional Group Tests ---

test.serial('group headers render in horizontal orientation', (t) => {
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

test.serial('group headers work with multi-select mode', async (t) => {
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

test.serial(
  'group headers render for groups containing disabled items',
  (t) => {
    const items = [
      { label: 'A', value: 'a', group: 'Tools', disabled: true },
      { label: 'B', value: 'b', group: 'Tools' },
    ]

    const { lastFrame } = render(<EnhancedSelectInput items={items} />)

    const frame = lastFrame()!
    t.true(frame.includes('── Tools ──'))
    t.true(frame.includes('A'))
    t.true(frame.includes('B'))
  }
)

test.serial(
  'non-contiguous items with same group each render under their own header',
  (t) => {
    // Non-contiguous items sharing a group name must each be preceded by their
    // own group header.  The old Set-based approach only emitted the header on
    // the first occurrence, causing later occurrences to render inside a foreign
    // section.
    const items = [
      { label: 'A', value: 'a', group: 'Alpha' },
      { label: 'B', value: 'b', group: 'Beta' },
      { label: 'C', value: 'c', group: 'Alpha' },
    ]

    const { lastFrame } = render(<EnhancedSelectInput items={items} />)

    const frame = lastFrame()!

    // Alpha header must appear twice: once before A and once before C.
    const alphaMatches = frame.split('── Alpha ──')
    t.is(alphaMatches.length, 3) // 2 occurrences → 3 parts when split
    t.true(frame.includes('── Beta ──'))

    // C's Alpha header must come after the Beta header, proving C is NOT
    // rendered inside the Beta section.
    const betaIndex = frame.indexOf('── Beta ──')
    const secondAlphaIndex = frame.indexOf('── Alpha ──', betaIndex)
    const cIndex = frame.indexOf('C')
    t.true(secondAlphaIndex > betaIndex)
    t.true(cIndex > secondAlphaIndex)
  }
)

test.serial('group headers with showScrollIndicators', (t) => {
  const items = [
    { label: 'A', value: 'a', group: 'First' },
    { label: 'B', value: 'b', group: 'First' },
    { label: 'C', value: 'c', group: 'Second' },
    { label: 'D', value: 'd', group: 'Second' },
  ]

  // Limit=2 only fits the header + one item (A) in the first page, since
  // headers now count toward limit — so 3 items remain below.
  const { lastFrame } = render(
    <EnhancedSelectInput showScrollIndicators items={items} limit={2} />
  )

  const frame = lastFrame()!
  t.true(frame.includes('── First ──'))
  t.true(frame.includes('▼'))
  t.true(frame.includes('3 more'))
})

// --- B9: group headers must count against limit ---

test.serial(
  'limit bounds rendered row count, not just item count, when every item has its own group',
  (t) => {
    const items = [
      { label: 'A', value: 'a', group: 'G1' },
      { label: 'B', value: 'b', group: 'G2' },
      { label: 'C', value: 'c', group: 'G3' },
      { label: 'D', value: 'd', group: 'G4' },
    ]

    const { lastFrame } = render(
      <EnhancedSelectInput items={items} limit={3} />
    )

    const frame = lastFrame()!
    const contentLines = frame.split('\n').filter((line) => line.trim() !== '')
    t.true(contentLines.length <= 3)
  }
)

test.serial(
  'hook: visibleItems plus headers stay within limit for grouped items',
  async (t) => {
    const items: Array<Item<unknown>> = [
      { label: 'A', value: 'a', group: 'G1' },
      { label: 'B', value: 'b', group: 'G2' },
      { label: 'C', value: 'c', group: 'G3' },
      { label: 'D', value: 'd', group: 'G4' },
    ]

    let result: UseEnhancedSelectInputResult<unknown> | undefined

    render(
      <HookHarness
        items={items}
        limit={3}
        onResult={(r) => {
          result = r
        }}
      />
    )

    await delay()
    const visibleItems = result?.visibleItems ?? []
    const headerCount = visibleItems.filter((item, index) => {
      const previous = index > 0 ? visibleItems[index - 1] : undefined
      return item.group && item.group !== previous?.group
    }).length

    const rowCount = visibleItems.length + headerCount
    t.true(rowCount <= 3)
    t.is(
      (result?.itemsAbove ?? 0) +
        visibleItems.length +
        (result?.itemsBelow ?? 0),
      items.length
    )
  }
)

test.serial(
  'shrinking limit at runtime keeps rendered row count bounded even when selection is unchanged',
  async (t) => {
    // Reproduces a dynamic terminal-resize scenario: a consumer lowers `limit`
    // without the selection moving. `rotateIndex` was a valid page start under
    // the old limit but not necessarily under the new one — the window must
    // still stay within the new bound.
    const items = [
      { label: 'A', value: 'a', group: 'G1' },
      { label: 'B', value: 'b', group: 'G2' },
      { label: 'C', value: 'c', group: 'G3' },
      { label: 'D', value: 'd', group: 'G4' },
      { label: 'E', value: 'e', group: 'G5' },
      { label: 'F', value: 'f', group: 'G6' },
    ]

    const { rerender, lastFrame } = render(
      <EnhancedSelectInput items={items} limit={6} initialIndex={3} />
    )

    await delay()
    let frame = lastFrame()!
    let contentLines = frame.split('\n').filter((line) => line.trim() !== '')
    t.true(contentLines.length <= 6)

    // Shrink limit while the selected index (3) stays valid — nothing else
    // about the props changes, so only the pageStarts recompute triggers.
    rerender(<EnhancedSelectInput items={items} limit={3} initialIndex={3} />)

    await delay()
    frame = lastFrame()!
    contentLines = frame.split('\n').filter((line) => line.trim() !== '')
    t.true(contentLines.length <= 3)
  }
)

test.serial(
  'limit=1 with a grouped item still renders the item (header + item exceeds limit)',
  (t) => {
    const items = [
      { label: 'A', value: 'a', group: 'Group' },
      { label: 'B', value: 'b', group: 'Group' },
    ]

    const { lastFrame } = render(
      <EnhancedSelectInput items={items} limit={1} />
    )

    const frame = lastFrame()!
    t.true(frame.includes('── Group ──'))
    t.true(frame.includes('A'))
    t.false(frame.includes('B'))
  }
)

// --- DefaultGroupHeaderComponent isolation ---

test.serial(
  'DefaultGroupHeaderComponent renders label with decorators',
  (t) => {
    const { lastFrame } = render(
      <DefaultGroupHeaderComponent label="My Group" />
    )

    const frame = lastFrame()!
    t.true(frame.includes('── My Group ──'))
  }
)

// --- Edge Cases: Single Item ---

test.serial('single item list: navigation wraps to itself', async (t) => {
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

test.serial('limit larger than items count shows all items', (t) => {
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

test.serial('limit=1 shows single item at a time', async (t) => {
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

test.serial('Escape calls onCancel in multi-select mode', async (t) => {
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
  await waitFor(() => cancelled)
  t.true(cancelled)
})

// --- Home/End in horizontal orientation ---

test.serial('Home key works in horizontal orientation', async (t) => {
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

test.serial('End key works in horizontal orientation', async (t) => {
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

test.serial(
  'multi-select defaultSelectedKeys works with explicit item.key',
  (t) => {
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
  }
)

// --- Hook: isFocused=false ---

test.serial('hook ignores all input when isFocused=false', async (t) => {
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

test.serial('keyboard input on empty items does not crash', async (t) => {
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

test.serial('hotkey updates selectedIndex to the hotkey item', async (t) => {
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

test.serial(
  'h/l hotkeys are ignored in horizontal orientation (nav takes priority)',
  async (t) => {
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
  }
)

// --- onSelect not provided does not crash ---

test.serial('enter without onSelect does not crash', async (t) => {
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

test.serial('navigation without onHighlight does not crash', async (t) => {
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

test.serial('multi-select navigation with arrow keys works', async (t) => {
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

test.serial('multi-select Home/End navigation works', async (t) => {
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

test.serial('indicatorComponent receives the current item', (t) => {
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

test.serial('per-item indicator only shows for selected item', async (t) => {
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

test.serial('showScrollIndicators uses ◀/▶ in horizontal mode', (t) => {
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

test.serial('rapid sequential navigation lands on correct item', async (t) => {
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

test.serial('onHighlight fires on initial mount', async (t) => {
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

test.serial(
  'onHighlight fires with correct item when initialIndex is set',
  async (t) => {
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
  }
)

test.serial(
  'onHighlight fires with the new item when filtering swaps the item at the same index',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    const highlights: string[] = []
    const { stdin } = render(
      <EnhancedSelectInput
        searchable
        items={items}
        onHighlight={(item) => {
          highlights.push(item.label)
        }}
      />
    )

    await delay()
    t.deepEqual(highlights, ['Apple'])

    // Filtering to "b" drops "Apple" and leaves "Banana" as the sole match at
    // index 0 — the same index "Apple" already occupied — so onHighlight must
    // still fire for the newly-highlighted item.
    stdin.write('b')
    await delay()

    t.deepEqual(highlights, ['Apple', 'Banana'])
  }
)

test.serial(
  'onHighlight does not fire again when the same item stays highlighted across a re-render',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ]

    const highlights: string[] = []
    const { stdin } = render(
      <EnhancedSelectInput
        searchable
        items={items}
        onHighlight={(item) => {
          highlights.push(item.label)
        }}
      />
    )

    await delay()
    t.deepEqual(highlights, ['Apple'])

    // Filtering to "a" still matches "Apple" first, so no new highlight call.
    stdin.write('a')
    await delay()

    t.deepEqual(highlights, ['Apple'])
  }
)

// --- Generic value type ---

test.serial(
  'works with complex object values when key is provided',
  async (t) => {
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
  }
)

// --- Multi-select: toggle then navigate then confirm ---

test.serial(
  'multi-select: toggle multiple items across navigation then confirm',
  async (t) => {
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
  }
)

// --- Items update: items grow ---

test.serial('selection stays valid when items grow', async (t) => {
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

test.serial(
  'selection resets when items are completely replaced',
  async (t) => {
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

    await waitFor(() => highlighted === 'X')
    t.is(highlighted, 'X')
  }
)

// --- Searchable Mode (#14) ---

test.serial('searchable: renders search input with placeholder', (t) => {
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

test.serial('searchable: renders custom placeholder', (t) => {
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

test.serial(
  'searchable: search prompt renders on its own line above items in horizontal orientation',
  (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    const { lastFrame } = render(
      <EnhancedSelectInput searchable items={items} orientation="horizontal" />
    )

    const lines = lastFrame()!.split('\n')
    const searchLineIndex = lines.findIndex((line) =>
      line.includes('/ Search...')
    )
    const itemsLineIndex = lines.findIndex(
      (line) => line.includes('Apple') && line.includes('Banana')
    )

    t.true(searchLineIndex !== -1)
    t.true(itemsLineIndex !== -1)
    t.true(searchLineIndex < itemsLineIndex)
    // The search prompt must not share a line with the items.
    t.false(lines[searchLineIndex]!.includes('Apple'))
  }
)

test.serial(
  'searchable: horizontal orientation item row layout matches vertical (unaffected by the search-line wrapper)',
  (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    const horizontal = render(
      <EnhancedSelectInput searchable items={items} orientation="horizontal" />
    ).lastFrame()!

    const vertical = render(
      <EnhancedSelectInput searchable items={items} orientation="vertical" />
    ).lastFrame()!

    const horizontalLines = horizontal.split('\n')
    const verticalLines = vertical.split('\n')

    // Vertical mode still stacks each item on its own line.
    t.true(verticalLines.some((line) => line.includes('Apple')))
    t.true(verticalLines.some((line) => line.includes('Banana')))
    t.false(
      verticalLines.some(
        (line) => line.includes('Apple') && line.includes('Banana')
      )
    )

    // Horizontal mode still puts both items on the same row.
    t.true(
      horizontalLines.some(
        (line) => line.includes('Apple') && line.includes('Banana')
      )
    )
  }
)

test.serial('searchable: typing filters items by label', async (t) => {
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

test.serial('searchable: filtering is case-insensitive', async (t) => {
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

test.serial('searchable: multi-character query narrows results', async (t) => {
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

test.serial(
  'searchable: backspace removes last character from query',
  async (t) => {
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
  }
)

test.serial('searchable: escape clears the search query', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  const { stdin, lastFrame } = render(
    <EnhancedSelectInput searchable items={items} />
  )

  await delay()
  stdin.write('app')
  await waitFor(() => !lastFrame()!.includes('Banana'))

  let frame = lastFrame()!
  t.false(frame.includes('Banana'))

  stdin.write(ESCAPE)
  await waitFor(() => lastFrame()!.includes('/ Search...'))

  frame = lastFrame()!
  // Query cleared — all items visible again
  t.true(frame.includes('Apple'))
  t.true(frame.includes('Banana'))
  t.true(frame.includes('/ Search...'))
})

test.serial(
  'searchable: escape calls onCancel when query is already empty',
  async (t) => {
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
    await waitFor(() => cancelled)
    t.true(cancelled)
  }
)

test.serial(
  'searchable: escape clears query first, then onCancel on second press',
  async (t) => {
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
    // Wait for the typed query to actually land before pressing Escape —
    // under load a fixed delay() isn't always long enough, and an Escape
    // sent while the query is still empty is indistinguishable from the
    // "clear query" case only by accident (see comment on `waitFor` above).
    await waitFor(() => lastFrame()!.includes('/ a'))

    // First escape clears query
    stdin.write(ESCAPE)
    await waitFor(() => cancelled || lastFrame()!.includes('/ Search...'))
    t.false(cancelled)
    t.true(lastFrame()!.includes('/ Search...'))

    // Second escape calls onCancel
    stdin.write(ESCAPE)
    await waitFor(() => cancelled)
    t.true(cancelled)
  }
)

test.serial(
  'searchable: arrow navigation works on filtered results',
  async (t) => {
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
  }
)

test.serial('searchable: enter selects from filtered results', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
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
  stdin.write('ban')
  // Wait for the filter to actually land before pressing Enter — under
  // load a fixed delay() isn't always long enough for the query state
  // update to commit, which would leave Apple highlighted instead of the
  // filtered-to Banana.
  await waitFor(() => lastFrame()!.includes('/ ban'))
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'Banana')
})

test.serial(
  'searchable: vim keys (j/k) are treated as search input, not navigation',
  async (t) => {
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
    await waitFor(() => lastFrame()!.includes('/ j'))

    const frame = lastFrame()!
    // 'j' should be in the search query, not navigate
    t.true(frame.includes('/ j'))
    // All items contain 'j' so all should be visible
    t.true(frame.includes('jelly'))
    t.true(frame.includes('jam'))
    t.true(frame.includes('juice'))
  }
)

test.serial('searchable: hotkeys are disabled', async (t) => {
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
  await waitFor(() => lastFrame()!.includes('/ a'))

  // 'a' should filter, not trigger hotkey
  t.is(selected, '')
  const frame = lastFrame()!
  t.true(frame.includes('/ a'))
})

test.serial(
  'searchable: shows "No matches" when query matches nothing',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('xyz')
    await waitFor(() => lastFrame()!.includes('No matches'))

    const frame = lastFrame()!
    t.true(frame.includes('No matches'))
    t.true(frame.includes('/ xyz'))
    t.false(frame.includes('Apple'))
    t.false(frame.includes('Banana'))
  }
)

test.serial(
  'searchable: selection resets to first item when query changes',
  async (t) => {
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
    await waitFor(() => highlighted === 'Apricot')
    t.is(highlighted, 'Apricot')

    // Typing resets selection to first match
    stdin.write('b')
    await waitFor(() => highlighted === 'Banana')
    t.is(highlighted, 'Banana')
  }
)

test.serial('searchable: works with disabled items', async (t) => {
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

test.serial(
  'searchable: space is treated as search character, not toggle',
  async (t) => {
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
  }
)

test.serial('searchable: hook exposes searchQuery in result', async (t) => {
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
  await waitFor(() => result?.searchQuery === 'app')
  t.is(result?.searchQuery, 'app')
})

test.serial(
  'searchable: non-searchable mode does not show search input',
  (t) => {
    const items = [{ label: 'Apple', value: 'apple' }]

    const { lastFrame } = render(<EnhancedSelectInput items={items} />)

    const frame = lastFrame()!
    t.false(frame.includes('/'))
    t.false(frame.includes('Search'))
  }
)

test.serial('searchable: works with limit/pagination', async (t) => {
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
  await waitFor(() => lastFrame()!.includes('/ a'))

  const frame = lastFrame()!
  // "a" matches Alpha, Bravo (has 'a'), Charlie (has 'a'), Delta (has 'a'), Able
  // With limit=2, only first 2 should be visible
  t.true(frame.includes('/ a'))
})

test.serial(
  'searchable: groups still render with filtered items',
  async (t) => {
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
    await waitFor(() => !lastFrame()!.includes('Broccoli'))

    const frame = lastFrame()!
    t.true(frame.includes('── Fruits ──'))
    t.true(frame.includes('Apple'))
    t.true(frame.includes('Apricot'))
    t.false(frame.includes('Broccoli'))
    t.false(frame.includes('── Vegetables ──'))
  }
)

test.serial('searchable: backspace on empty query does nothing', async (t) => {
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

test.serial(
  'searchable + multiple: can filter then confirm checked items',
  async (t) => {
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
    // Filter to only "ap" items, then confirm — checked items hidden by the
    // active filter (cherry) must still be included, not silently dropped.
    stdin.write('ap')
    await delay()
    stdin.write(ENTER)
    await delay()

    t.is(confirmed.length, 2)
    t.true(confirmed.includes('apple'))
    t.true(confirmed.includes('cherry'))
  }
)

test.serial(
  'searchable + multiple: checking items across two different queries confirms both',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ]

    let confirmed: string[] = []
    const { stdin } = render(
      <EnhancedSelectInput
        searchable
        multiple
        items={items}
        defaultSelectedKeys={['apple', 'banana']}
        onConfirm={(selected) => {
          confirmed = selected.map((item) => String(item.value))
        }}
      />
    )

    await delay()
    // Filter to a query that hides "apple" entirely, then confirm — apple
    // was checked before this query and must survive into onConfirm.
    stdin.write('ban')
    await delay()
    stdin.write(ENTER)
    await delay()

    t.is(confirmed.length, 2)
    t.true(confirmed.includes('apple'))
    t.true(confirmed.includes('banana'))
  }
)

test.serial(
  'searchable + multiple: confirmScope "filtered" restores scoped confirm behaviour',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Apricot', value: 'apricot' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ]

    let confirmed: string[] = []
    const { stdin, lastFrame } = render(
      <EnhancedSelectInput
        searchable
        multiple
        items={items}
        defaultSelectedKeys={['apple', 'cherry']}
        confirmScope="filtered"
        onConfirm={(selected) => {
          confirmed = selected.map((item) => String(item.value))
        }}
      />
    )

    await delay()
    stdin.write('ap')
    // Wait for the filter to actually land before confirming — otherwise Enter
    // can race the query state update and confirm against the unfiltered set.
    await waitFor(() => !lastFrame()!.includes('Banana'))
    stdin.write(ENTER)
    await waitFor(() => confirmed.length > 0)

    // Only "apple" matches the filter AND is checked; cherry is excluded
    // because confirmScope is explicitly opted into filtered-only confirm.
    t.is(confirmed.length, 1)
    t.true(confirmed.includes('apple'))
  }
)

// --- Searchable + limit + navigation ---

test.serial(
  'searchable + limit: navigation works within paginated filtered results',
  async (t) => {
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
  }
)

// --- Searchable + isFocused=false ---

test.serial('searchable: typing blocked when isFocused=false', async (t) => {
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

test.serial(
  'searchable: Home/End work on filtered results (horizontal orientation)',
  async (t) => {
    // In vertical orientation (the default) Home/End address the search-line
    // cursor instead — see "searchable: Home/End move the search cursor,
    // not the list" below. Horizontal orientation still uses them for
    // list-boundary jumps, since the cursor keys there are left for the
    // search line's own Ctrl+A/Ctrl+E.
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
        orientation="horizontal"
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Alpha')

    stdin.write('ap')
    await delay()
    // After filtering, move right first to change selectedIndex
    stdin.write(ARROW_RIGHT)
    await delay()
    t.is(highlighted, 'Apple')

    stdin.write(HOME)
    await delay()
    t.is(highlighted, 'Apex')

    stdin.write(END)
    await delay()
    t.is(highlighted, 'Apple')
  }
)

// --- Searchable: query with no results then backspace restores items ---

test.serial(
  'searchable: multiple backspaces progressively restore items',
  async (t) => {
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
    await waitFor(() => lastFrame()!.includes('/ app'))

    let frame = lastFrame()!
    t.true(frame.includes('/ app'))
    t.true(frame.includes('Apple'))
    t.false(frame.includes('Apricot'))
    t.false(frame.includes('Banana'))

    // Single backspace to "ap" — now Apricot also matches
    stdin.write('\u007F')
    await waitFor(() => lastFrame()!.includes('Apricot'))

    frame = lastFrame()!
    t.true(frame.includes('/ ap'))
    t.true(frame.includes('Apple'))
    t.true(frame.includes('Apricot'))
    t.false(frame.includes('Banana'))
  }
)

// --- Searchable: text-input cursor ergonomics (F3) ---

test.serial(
  'searchable: Home then typing inserts at the start of the query',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Xapple', value: 'xapple' },
    ]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('apple')
    await waitFor(() => lastFrame()!.includes('/ apple'))

    stdin.write(HOME)
    await delay()
    stdin.write('X')
    await waitFor(() => lastFrame()!.includes('/ Xapple'))

    const frame = lastFrame()!
    t.true(frame.includes('/ Xapple'))
    t.true(frame.includes('Xapple'))
  }
)

test.serial(
  'searchable: End then Backspace removes the last character',
  async (t) => {
    const items = [{ label: 'Apple', value: 'apple' }]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('Xapp')
    await waitFor(() => lastFrame()!.includes('/ Xapp'))

    stdin.write(HOME)
    await delay()
    stdin.write(END)
    await delay()
    stdin.write('')
    await waitFor(() => !lastFrame()!.includes('/ Xapp'))

    t.true(lastFrame()!.includes('/ Xap'))
  }
)

test.serial(
  'searchable: left arrow twice then backspace deletes the middle character',
  async (t) => {
    const items = [{ label: 'Abc', value: 'abc' }]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('abc')
    await waitFor(() => lastFrame()!.includes('/ abc'))

    stdin.write(ARROW_LEFT)
    await delay()
    stdin.write(ARROW_LEFT)
    await delay()
    // Cursor is now before "b" (between "a" and "bc") — backspace removes "a".
    stdin.write('')
    await waitFor(() => lastFrame()!.includes('/ bc'))

    t.true(lastFrame()!.includes('/ bc'))
  }
)

test.serial(
  'searchable: multi-character paste inserts at the cursor and advances it by the chunk length',
  async (t) => {
    const items = [{ label: 'AXYZC', value: 'axyzc' }]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('ac')
    await waitFor(() => lastFrame()!.includes('/ ac'))

    // Cursor is now between "a" and "c".
    stdin.write(ARROW_LEFT)
    await delay()

    // Simulate a paste: Ink coalesces multiple chars delivered in one stdin
    // event into a single keypress with a multi-char `input` string.
    stdin.write('XY')
    await waitFor(() => lastFrame()!.includes('/ aXYc'))

    // If the cursor had stayed at its pre-paste position instead of
    // advancing by the pasted chunk's length, this would insert "Z" before
    // "XY" (producing "aZXYc") instead of after it.
    stdin.write('Z')
    await waitFor(() => lastFrame()!.includes('/ aXYZc'))

    const frame = lastFrame()!
    t.true(frame.includes('/ aXYZc'))
  }
)

test.serial(
  'searchable: Ctrl+W deletes the word before the cursor',
  async (t) => {
    const items = [{ label: 'Foo', value: 'foo' }]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('foo bar')
    await waitFor(() => lastFrame()!.includes('/ foo bar'))

    stdin.write(CTRL_W)
    await waitFor(() => !lastFrame()!.includes('bar'))

    const frame = lastFrame()!
    t.true(frame.includes('/ foo'))
    t.false(frame.includes('bar'))
  }
)

test.serial(
  'searchable: Ctrl+U kills the query from the start up to the cursor',
  async (t) => {
    const items = [{ label: 'Bar', value: 'bar' }]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('foo bar')
    await waitFor(() => lastFrame()!.includes('/ foo bar'))

    // Move cursor to just after "foo " (between the space and "bar").
    stdin.write(HOME)
    await delay()
    stdin.write(ARROW_RIGHT.repeat(4))
    await delay()

    stdin.write(CTRL_U)
    await waitFor(() => !lastFrame()!.includes('foo'))

    const frame = lastFrame()!
    t.true(frame.includes('/ bar'))
    t.false(frame.includes('foo'))
  }
)

test.serial(
  'searchable: Ctrl+A/Ctrl+E move the cursor to start/end for editing',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Apples', value: 'apples' },
    ]

    const { stdin, lastFrame } = render(
      <EnhancedSelectInput searchable items={items} />
    )

    await delay()
    stdin.write('Apple')
    await waitFor(() => lastFrame()!.includes('/ Apple'))

    stdin.write(CTRL_A)
    await delay()
    stdin.write('X')
    await waitFor(() => lastFrame()!.includes('/ XApple'))
    t.true(lastFrame()!.includes('/ XApple'))

    stdin.write(CTRL_E)
    await delay()
    stdin.write('s')
    await waitFor(() => lastFrame()!.includes('/ XApples'))
    t.true(lastFrame()!.includes('/ XApples'))
  }
)

test.serial(
  'searchable: filtering still resets the highlighted item after a cursor-based edit',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Apricot', value: 'apricot' },
      { label: 'Banana', value: 'banana' },
    ]

    let highlighted = ''
    const { stdin, lastFrame } = render(
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
    await waitFor(() => lastFrame()!.includes('/ ap'))
    stdin.write(ARROW_DOWN)
    await delay()
    t.is(highlighted, 'Apricot')

    stdin.write(HOME)
    await delay()
    stdin.write('X')
    await waitFor(() => lastFrame()!.includes('/ Xap'))

    // "Xap" matches nothing, so the list should show no matches and the
    // highlight should not still be pinned to "Apricot".
    t.true(lastFrame()!.includes('No matches'))
  }
)

test.serial(
  'searchable: cursor keys do nothing when searchable is false',
  async (t) => {
    const items = [
      { label: 'Alpha', value: 'a' },
      { label: 'Beta', value: 'b' },
    ]

    let highlighted = ''
    const { stdin, lastFrame } = render(
      <EnhancedSelectInput
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Alpha')

    stdin.write(CTRL_W)
    await delay()
    stdin.write(CTRL_U)
    await delay()
    stdin.write(CTRL_A)
    await delay()
    stdin.write(CTRL_E)
    await delay()

    t.is(highlighted, 'Alpha')
    t.false(lastFrame()!.includes('/ '))
  }
)

// --- keyMap: selective key group disabling ---

test.serial('keyMap.arrows=false disables arrow key navigation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      keyMap={{ arrows: false }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )
  await delay()
  t.is(highlighted, 'A')
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'A') // Must not move
})

test.serial(
  'keyMap.arrows=false still allows vim key navigation',
  async (t) => {
    const items = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ]
    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        items={items}
        keyMap={{ arrows: false }}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )
    await delay()
    stdin.write('j')
    await waitFor(() => highlighted === 'B')
    t.is(highlighted, 'B')
  }
)

test.serial('keyMap.vimKeys=false disables j/k navigation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      keyMap={{ vimKeys: false }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )
  await delay()
  t.is(highlighted, 'A')
  stdin.write('j')
  await delay()
  t.is(highlighted, 'A') // J must not navigate
})

test.serial('keyMap.vimKeys=false still allows arrow navigation', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      keyMap={{ vimKeys: false }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )
  await delay()
  stdin.write(ARROW_DOWN)
  await waitFor(() => highlighted === 'B')
  t.is(highlighted, 'B')
})

test.serial('keyMap.homeEnd=false disables Home/End keys', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ]
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      initialIndex={1}
      keyMap={{ homeEnd: false }}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )
  await delay()
  t.is(highlighted, 'B')
  stdin.write(HOME)
  await delay()
  t.is(highlighted, 'B') // Must not jump to A
  stdin.write(END)
  await delay()
  t.is(highlighted, 'B') // Must not jump to C
})

test.serial('keyMap.cancel=false disables Escape → onCancel', async (t) => {
  const items = [{ label: 'A', value: 'a' }]
  let cancelled = false
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      keyMap={{ cancel: false }}
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

test.serial('keyMap.select=false disables Enter → onSelect', async (t) => {
  const items = [{ label: 'A', value: 'a' }]
  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      keyMap={{ select: false }}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )
  await delay()
  stdin.write(ENTER)
  await delay()
  t.is(selected, '')
})

test.serial(
  'keyMap.toggle=false disables Space in multi-select mode',
  async (t) => {
    const items = [{ label: 'A', value: 'a' }]
    let toggled = false
    const { stdin } = render(
      <EnhancedSelectInput
        multiple
        items={items}
        keyMap={{ toggle: false }}
        onToggle={() => {
          toggled = true
        }}
      />
    )
    await delay()
    stdin.write(SPACE)
    await delay()
    t.false(toggled)
  }
)

test.serial('keyMap defaults to all enabled when not provided', async (t) => {
  const items = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ]
  let selected = ''
  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )
  await delay()
  stdin.write(ARROW_DOWN)
  await delay()
  t.is(highlighted, 'B')
  stdin.write(ENTER)
  await delay()
  t.is(selected, 'B')
})

// --- typeahead ---

test.serial(
  'typeahead: typing a single char jumps to first item with that prefix',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Apple')

    stdin.write('c')
    await delay()
    t.is(highlighted, 'Cherry')
  }
)

test.serial(
  'typeahead: typing two chars within timeout jumps to matching item',
  async (t) => {
    const items = [
      { label: 'Doe', value: 'doe' },
      { label: 'Denver', value: 'denver' },
      { label: 'Echo', value: 'echo' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    stdin.write('d')
    await delay()
    t.is(highlighted, 'Doe')

    stdin.write('e')
    await delay()
    t.is(highlighted, 'Denver')
  }
)

test.serial('typeahead: match is case-insensitive', async (t) => {
  const items = [
    { label: 'apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      typeahead
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write('B')
  await delay()
  t.is(highlighted, 'Banana')
})

test.serial(
  'typeahead: idle reset starts a fresh buffer after the timeout',
  async (t) => {
    const items = [
      { label: 'Delta', value: 'delta' },
      { label: 'Denver', value: 'denver' },
      { label: 'Echo', value: 'echo' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        typeaheadTimeout={50}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    stdin.write('d')
    await delay()
    t.is(highlighted, 'Delta')

    await delay(100)
    stdin.write('e')
    await delay()
    t.is(highlighted, 'Echo')
  }
)

test.serial('typeahead: does not call onSelect', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let selected = ''
  const { stdin } = render(
    <EnhancedSelectInput
      typeahead
      items={items}
      onSelect={(item) => {
        selected = item.label
      }}
    />
  )

  await delay()
  stdin.write('b')
  await delay()
  t.is(selected, '')
})

test.serial(
  'typeahead: disabled items are skipped as match targets',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Apricot', value: 'apricot', disabled: true },
      { label: 'Banana', value: 'banana' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    stdin.write('a')
    await delay()
    t.is(highlighted, 'Apple')
  }
)

test.serial('typeahead: no match leaves selection unchanged', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      typeahead
      items={items}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Apple')

  stdin.write('z')
  await delay()
  t.is(highlighted, 'Apple')
})

test.serial(
  'typeahead: searchable=true ignores typeahead (printable chars filter instead)',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    const { lastFrame, stdin } = render(
      <EnhancedSelectInput searchable typeahead items={items} />
    )

    await delay()
    stdin.write('b')
    await delay()

    const frame = lastFrame()!
    t.true(frame.includes('/ b'))
    t.true(frame.includes('Banana'))
    t.false(frame.includes('Apple'))
  }
)

test.serial(
  'typeahead=false (default): typing a non-hotkey char does nothing',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
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
    t.is(highlighted, 'Apple')

    stdin.write('b')
    await delay()
    t.is(highlighted, 'Apple')
  }
)

test.serial(
  'typeahead: idle hotkey char fires the hotkey instead of just jumping',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Delta', value: 'delta', hotkey: 'd' },
    ]

    let selected = ''
    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onSelect={(item) => {
          selected = item.label
        }}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    stdin.write('d')
    await delay()
    t.is(selected, 'Delta')
    t.is(highlighted, 'Delta')
  }
)

test.serial(
  'typeahead: works within a limit window, paginating to an off-page match',
  async (t) => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      label: `Item${i}`,
      value: `item-${i}`,
    }))

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        limit={3}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    stdin.write('Item9')
    await delay()
    t.is(highlighted, 'Item9')
  }
)

test.serial('typeahead: isFocused=false blocks typeahead', async (t) => {
  const items = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ]

  let highlighted = ''
  const { stdin } = render(
    <EnhancedSelectInput
      typeahead
      items={items}
      isFocused={false}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Apple')

  stdin.write('b')
  await delay()
  t.is(highlighted, 'Apple')
})

test.serial(
  'typeahead: vim nav keys are excluded from the buffer, not treated as a jump prefix',
  async (t) => {
    // Items ordered so vim-down and a "j..." prefix jump land on different
    // items: if `j` were captured into the type-ahead buffer instead of
    // triggering vim navigation, the highlight would land on Jam.
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Jam', value: 'jam' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Apple')

    stdin.write('j')
    await delay()
    t.is(highlighted, 'Banana')
  }
)

test.serial(
  'typeahead: Ctrl-modified keys are ignored, not captured into the buffer',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]

    let highlighted = ''
    const { stdin } = render(
      <EnhancedSelectInput
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Apple')

    // Ctrl+B (\u0002) surfaces as input 'b' with key.ctrl=true; the same
    // guard also excludes key.meta, which follows the identical code path.
    stdin.write('\u0002')
    await delay()
    t.is(highlighted, 'Apple')
  }
)

test.serial(
  'typeahead: combined with multiple, jumps the highlight without toggling checkedKeys',
  async (t) => {
    const items = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ]

    let highlighted = ''
    const { stdin, lastFrame } = render(
      <EnhancedSelectInput
        multiple
        typeahead
        items={items}
        onHighlight={(item) => {
          highlighted = item.label
        }}
      />
    )

    await delay()
    t.is(highlighted, 'Apple')
    t.is((lastFrame()!.match(/\[x]/g) ?? []).length, 0)

    stdin.write('c')
    await delay()
    t.is(highlighted, 'Cherry')
    t.is((lastFrame()!.match(/\[x]/g) ?? []).length, 0)

    stdin.write(SPACE)
    await delay()
    const frame = lastFrame()!
    t.is((frame.match(/\[x]/g) ?? []).length, 1)
    const cherryLine = frame.split('\n').find((line) => line.includes('Cherry'))
    t.true(cherryLine?.includes('[x]'))
  }
)
