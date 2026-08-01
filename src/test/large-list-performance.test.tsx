import test from 'ava'
import { render } from 'ink-testing-library'
import React from 'react'
import {
  computePageStarts,
  EnhancedSelectInput,
  type Item,
} from '../enhanced-select-input/index.js'

// ANSI escape sequences for arrow keys / boundary jumps
const ARROW_DOWN = '[B'
const HOME = '[H'
const END = '[F'

const delay = async (ms = 100) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

// Polls instead of sleeping-and-hoping, matching the pattern in
// enhanced-select-input.test.tsx — avoids flakiness from state updates that
// land slightly after a fixed delay under CI/CPU load.
const waitFor = async (condition: () => boolean, timeout = 2000) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start >= timeout) return
    // eslint-disable-next-line no-await-in-loop
    await delay(20)
  }
}

const ITEM_COUNT = 10_000
const LIMIT = 10

const bigItems: Array<Item<string>> = Array.from(
  { length: ITEM_COUNT },
  (_, i) => ({
    label: `Item ${i}`,
    value: `item-${i}`,
  })
)

// 100 groups of 100 items each, so header-budgeting in computePageStarts is
// exercised at scale too.
const bigGroupedItems: Array<Item<string>> = Array.from(
  { length: ITEM_COUNT },
  (_, i) => ({
    label: `Item ${i}`,
    value: `item-${i}`,
    group: `Group ${Math.floor(i / 100)}`,
  })
)

const countNonEmptyLines = (frame: string) =>
  frame.split('\n').filter((line) => line.trim() !== '').length

test('10k items: initial render is bounded by limit, independent of n', (t) => {
  const { lastFrame } = render(
    <EnhancedSelectInput showScrollIndicators items={bigItems} limit={LIMIT} />
  )

  const frame = lastFrame()!
  // Limit rows + up to 2 scroll-indicator rows
  t.true(countNonEmptyLines(frame) <= LIMIT + 2)
  t.true(frame.includes('Item 0'))
  t.true(frame.includes(`${ITEM_COUNT - LIMIT} more`))
})

test('10k items: computePageStarts runs once and produces the expected page count', (t) => {
  const start = performance.now()
  const pageStarts = computePageStarts(bigItems, LIMIT)
  const elapsedMs = performance.now() - start

  t.is(pageStarts.length, Math.ceil(ITEM_COUNT / LIMIT))
  // Informational only, not a strict perf gate — the page-count assertion
  // above is the real regression check. Logged so a runaway regression is
  // still visible in test output without making the suite flaky on slow
  // CI runners.
  t.log(`computePageStarts(${ITEM_COUNT} items) took ${elapsedMs.toFixed(2)}ms`)
})

test('10k items: many ↓ presses keep the rendered frame bounded and move the selection', async (t) => {
  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={bigItems}
      limit={LIMIT}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  t.is(highlighted, 'Item 0')

  // Each press must land as its own event/render cycle — Ink parses a whole
  // batch of escape sequences written in a single `stdin.write` call inside
  // one synchronous React batch, so simulating "many key presses" requires
  // one `write` per press (as a real terminal would deliver them). Use the
  // same delay budget as the rest of the suite (enhanced-select-input.test.tsx)
  // rather than a tighter one, since tightening it risks dropped/coalesced
  // key events under CI load.
  const presses = 35
  for (let i = 0; i < presses; i++) {
    stdin.write(ARROW_DOWN)
    // eslint-disable-next-line no-await-in-loop
    await delay()
  }

  await waitFor(() => highlighted === `Item ${presses}`)

  t.is(highlighted, `Item ${presses}`)
  const frame = lastFrame()!
  t.true(countNonEmptyLines(frame) <= LIMIT + 2)
  t.true(frame.includes(`Item ${presses}`))
})

test('10k items: End jumps to the last item and keeps the frame bounded', async (t) => {
  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={bigItems}
      limit={LIMIT}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()

  t.is(highlighted, `Item ${ITEM_COUNT - 1}`)
  const frame = lastFrame()!
  t.true(countNonEmptyLines(frame) <= LIMIT + 2)
  t.true(frame.includes(`Item ${ITEM_COUNT - 1}`))
  t.false(frame.includes(`${ITEM_COUNT} more`))
})

test('10k items: Home jumps back to the first item and keeps the frame bounded', async (t) => {
  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={bigItems}
      limit={LIMIT}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()
  stdin.write(HOME)
  await delay()

  t.is(highlighted, 'Item 0')
  const frame = lastFrame()!
  t.true(countNonEmptyLines(frame) <= LIMIT + 2)
  t.true(frame.includes('Item 0'))
  t.true(frame.includes(`${ITEM_COUNT - LIMIT} more`))
})

test('10k grouped items: page budgeting keeps the frame bounded at scale', (t) => {
  const groupLimit = 20
  const { lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={bigGroupedItems}
      limit={groupLimit}
    />
  )

  const frame = lastFrame()!
  t.true(countNonEmptyLines(frame) <= groupLimit + 2)
  t.true(frame.includes('── Group 0 ──'))
  t.true(frame.includes('Item 0'))
})

test('10k grouped items: End jumps to the last group and item, frame stays bounded', async (t) => {
  const groupLimit = 20
  let highlighted = ''
  const { stdin, lastFrame } = render(
    <EnhancedSelectInput
      showScrollIndicators
      items={bigGroupedItems}
      limit={groupLimit}
      onHighlight={(item) => {
        highlighted = item.label
      }}
    />
  )

  await delay()
  stdin.write(END)
  await delay()

  t.is(highlighted, `Item ${ITEM_COUNT - 1}`)
  const frame = lastFrame()!
  t.true(countNonEmptyLines(frame) <= groupLimit + 2)
  t.true(frame.includes(`── Group ${ITEM_COUNT / 100 - 1} ──`))
  t.true(frame.includes(`Item ${ITEM_COUNT - 1}`))
})
