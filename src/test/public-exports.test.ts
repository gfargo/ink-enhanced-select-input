import test from 'ava'
import {
  isGroupHeaderRow,
  isItem,
  isNavigable,
  isSelectable,
  isSeparator,
  type GroupHeaderRow,
  type Item,
  type NavRow,
  type SeparatorItem,
} from '../index.js'
import {
  isGroupHeaderRow as headlessIsGroupHeaderRow,
  isItem as headlessIsItem,
  isNavigable as headlessIsNavigable,
  isSelectable as headlessIsSelectable,
  isSeparator as headlessIsSeparator,
  type GroupHeaderRow as HeadlessGroupHeaderRow,
  type NavRow as HeadlessNavRow,
} from '../headless.js'

// `visibleItems` is typed `Array<NavRow<V>>` and its docs tell consumers to
// narrow each row with `isGroupHeaderRow` before treating it as an `Item`.
// That workflow is only possible if the guards *and* the row types are
// actually reachable from the published entrypoints — they were not, so a
// `collapsible` headless consumer could neither narrow the union nor name
// its type. These tests fail at import time if that regresses.

const ROW_GUARDS = {
  isSeparator,
  isSelectable,
  isItem,
  isGroupHeaderRow,
  isNavigable,
} as const

const HEADLESS_ROW_GUARDS = {
  isSeparator: headlessIsSeparator,
  isSelectable: headlessIsSelectable,
  isItem: headlessIsItem,
  isGroupHeaderRow: headlessIsGroupHeaderRow,
  isNavigable: headlessIsNavigable,
} as const

test('the row-narrowing guards are exported from the package root', (t) => {
  for (const [name, guard] of Object.entries(ROW_GUARDS)) {
    t.is(typeof guard, 'function', `${name} must be exported from "."`)
  }
})

test('the row-narrowing guards are exported from the headless entrypoint', (t) => {
  for (const [name, guard] of Object.entries(HEADLESS_ROW_GUARDS)) {
    t.is(typeof guard, 'function', `${name} must be exported from "./headless"`)
  }
})

test('both entrypoints export the same guard implementations', (t) => {
  for (const name of Object.keys(ROW_GUARDS) as Array<
    keyof typeof ROW_GUARDS
  >) {
    t.is(
      ROW_GUARDS[name],
      HEADLESS_ROW_GUARDS[name],
      `${name} must be identical`
    )
  }
})

test('the guards narrow a NavRow union the way visibleItems documents', (t) => {
  const item: Item<string> = { label: 'Apple', value: 'apple', group: 'Fruit' }
  const separator: SeparatorItem = { type: 'separator' }
  const header: GroupHeaderRow = {
    type: 'group-header',
    group: 'Fruit',
    key: 'group-header-Fruit',
    collapsed: false,
  }
  const disabled: Item<string> = {
    label: 'Nope',
    value: 'nope',
    disabled: true,
  }

  // Exactly the shape `visibleItems` hands back in `collapsible` mode.
  const rows: Array<NavRow<string>> = [header, item, separator, disabled]

  const labels: string[] = []
  const groups: string[] = []
  for (const row of rows) {
    if (isGroupHeaderRow(row)) {
      // Narrowed to GroupHeaderRow — `.group` is only reachable if the type
      // predicate survived the export.
      groups.push(row.group)
    } else if (isItem(row)) {
      labels.push(row.label)
    }
  }

  t.deepEqual(groups, ['Fruit'])
  t.deepEqual(labels, ['Apple', 'Nope'])

  t.true(isSeparator(separator))
  t.false(isItem(separator))
  t.false(isNavigable(separator))

  t.true(isNavigable(header))
  t.false(isSelectable(header))

  t.true(isSelectable(item))
  t.false(isSelectable(disabled))
  t.true(isItem(disabled))
})

// Both entrypoints must describe the same row types, not two structurally
// divergent copies.
type ExtReq<A, B> = Required<A> extends Required<B> ? true : false
type AssertEqual<A, B> = ExtReq<A, B> extends true ? ExtReq<B, A> : false

export const rowTypeLocks: {
  navRow: AssertEqual<NavRow<string>, HeadlessNavRow<string>>
  groupHeaderRow: AssertEqual<GroupHeaderRow, HeadlessGroupHeaderRow>
} = {
  navRow: true,
  groupHeaderRow: true,
}

test('the NavRow/GroupHeaderRow types match across both entrypoints', (t) => {
  t.deepEqual(rowTypeLocks, { navRow: true, groupHeaderRow: true })
})
