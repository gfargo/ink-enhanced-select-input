import test from 'ava'
import React from 'react'
import {
  EnhancedSelectInput,
  type Item,
} from '../enhanced-select-input/index.js'
import { renderStrict } from './_render-strict.js'

// ANSI escape sequences for arrow keys
const ARROW_DOWN = '[B'
const ARROW_UP = '[A'
const ENTER = '\r'
const SPACE = ' '

const delay = async (ms = 300) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const waitFor = async (condition: () => boolean, timeout = 2000) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start >= timeout) return
    // eslint-disable-next-line no-await-in-loop
    await delay(20)
  }
}

const items: Array<Item<string>> = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
]

test.serial(
  'StrictMode: renders normally when wrapped in React.StrictMode',
  (t) => {
    const { lastFrame } = renderStrict(<EnhancedSelectInput items={items} />)

    const frame = lastFrame()
    t.truthy(frame)
    t.true(frame?.includes('Apple'))
    t.true(frame?.includes('Banana'))
    t.true(frame?.includes('Cherry'))
  }
)

// --- B8: onToggle must fire exactly once per Space press under StrictMode ---
// https://github.com/gfargo/ink-enhanced-select-input/issues/64 — the next
// state was originally computed *and* onToggle fired from inside a
// functional setCheckedKeys(prev => ...) updater. React (deliberately)
// invokes functional updaters more than once under StrictMode, so a single
// Space press reported onToggle twice, both times with the same `checked`
// value. `toggle()` now computes the next Set up front and calls onToggle
// once, synchronously, before ever touching state — these tests pin that
// contract down under StrictMode so it can't regress silently.

test.serial(
  'B8: a single Space press fires onToggle exactly once under StrictMode',
  async (t) => {
    const log: Array<{ label: string; checked: boolean }> = []
    const { stdin } = renderStrict(
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
    await waitFor(() => log.length > 0)

    t.is(log.length, 1)
    t.is(log[0]?.label, 'Apple')
    t.is(log[0]?.checked, true)
  }
)

test.serial(
  'B8: check-then-uncheck reports exactly two coherent onToggle calls under StrictMode',
  async (t) => {
    const log: Array<{ checked: boolean }> = []
    const { stdin } = renderStrict(
      <EnhancedSelectInput
        multiple
        items={items}
        onToggle={(_item, checked) => {
          log.push({ checked })
        }}
      />
    )

    await delay()
    stdin.write(SPACE)
    await waitFor(() => log.length === 1)
    stdin.write(SPACE)
    await waitFor(() => log.length === 2)

    t.deepEqual(
      log.map((entry) => entry.checked),
      [true, false]
    )
  }
)

test.serial(
  'B8: the checkbox indicator reflects a single toggle under StrictMode',
  async (t) => {
    const { stdin, lastFrame } = renderStrict(
      <EnhancedSelectInput multiple items={items} />
    )

    await delay()
    stdin.write(SPACE)
    await delay()

    const frame = lastFrame()!
    t.is((frame.match(/\[x]/g) ?? []).length, 1)
    t.is((frame.match(/\[ ]/g) ?? []).length, 2)
  }
)

// --- Canary: pins down this environment's actual StrictMode behavior ---
// The B8 tests above assert the *contract* (single onToggle per Space press)
// but can't mechanically force a double-invoke to prove they'd fail against
// a buggy implementation on their own. This canary proves the double-invoke
// is real in this environment: with the development build of react-reconciler
// (what CI and any real StrictMode-enabled app run — see AVA's default
// NODE_ENV=test), a functional setState updater fired from a StrictMode
// component's effect genuinely runs twice per commit, exactly like React DOM.
// That's precisely the hazard `toggle()` was fixed to avoid (computing the
// next Set up front and calling onToggle once, before ever touching state)
// rather than a theoretical concern — so this makes it an explicit, CI-
// checked assertion instead of an unverified claim.

test.serial(
  'StrictMode canary: functional state updaters run twice per commit in this environment',
  async (t) => {
    let updaterCalls = 0

    function Canary() {
      const [count, setCount] = React.useState(0)
      void count
      React.useEffect(() => {
        setCount((previous) => {
          updaterCalls++
          return previous + 1
        })
      }, [])
      return null
    }

    renderStrict(<Canary />)
    await delay()

    t.is(updaterCalls, 2)
  }
)

// --- Core navigation/selection under StrictMode ---

test.serial(
  'StrictMode: arrow-key navigation moves the highlight',
  async (t) => {
    const highlighted: string[] = []
    const { stdin, lastFrame } = renderStrict(
      <EnhancedSelectInput
        items={items}
        onHighlight={(item) => {
          highlighted.push(item.label)
        }}
      />
    )

    await delay()
    stdin.write(ARROW_DOWN)
    await waitFor(() => lastFrame()?.includes('> Banana') ?? false)
    t.true(lastFrame()?.includes('> Banana'))

    stdin.write(ARROW_UP)
    await waitFor(() => lastFrame()?.includes('> Apple') ?? false)
    t.true(lastFrame()?.includes('> Apple'))

    t.true(highlighted.includes('Banana'))
    t.true(highlighted.includes('Apple'))
  }
)

test.serial(
  'StrictMode: Enter fires onSelect exactly once with the highlighted item',
  async (t) => {
    const selected: string[] = []
    const { stdin } = renderStrict(
      <EnhancedSelectInput
        items={items}
        onSelect={(item) => {
          selected.push(item.label)
        }}
      />
    )

    await delay()
    stdin.write(ARROW_DOWN)
    await delay()
    stdin.write(ENTER)
    await waitFor(() => selected.length > 0)

    t.deepEqual(selected, ['Banana'])
  }
)

test.serial(
  'StrictMode: multi-select confirms the checked items exactly once',
  async (t) => {
    let confirmed: Array<Item<string>> | undefined
    let confirmCount = 0
    const { stdin } = renderStrict(
      <EnhancedSelectInput
        multiple
        items={items}
        onConfirm={(checkedItems) => {
          confirmCount++
          confirmed = checkedItems
        }}
      />
    )

    await delay()
    stdin.write(SPACE) // Check Apple
    await delay()
    stdin.write(ARROW_DOWN)
    await delay()
    stdin.write(ARROW_DOWN)
    await delay()
    stdin.write(SPACE) // Check Cherry
    await delay()
    stdin.write(ENTER)
    await waitFor(() => confirmed !== undefined)

    t.is(confirmCount, 1)
    t.deepEqual(
      confirmed?.map((item) => item.label),
      ['Apple', 'Cherry']
    )
  }
)
