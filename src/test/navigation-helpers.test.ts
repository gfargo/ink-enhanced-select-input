import test from 'ava'
import {
  buildNavigableRows,
  computeNavRowPageStarts,
  computePageStarts,
  findFirstValidIndex,
  findLastValidIndex,
  findNextValidIndex,
  findPageIndex,
  isGroupHeaderRow,
  pageIndexOfStart,
  pageStartFor,
  resolveInitialIndex,
  resolveInitialSelection,
  truncateLabel,
  type Item,
  type ItemOrSeparator,
  type NavRow,
  type SeparatorItem,
} from '../enhanced-select-input/index.js'

/** Reference O(pages) linear scan — mirrors the pre-binary-search behaviour. */
function linearPageStartFor(pageStarts: number[], index: number): number {
  let result = 0
  for (const start of pageStarts) {
    if (start <= index) result = start
    else break
  }

  return result
}

const mkItem = (label: string, disabled = false): Item<string> => ({
  label,
  value: label,
  disabled,
})

const mkGroupedItem = (label: string, group?: string): Item<string> => ({
  label,
  value: label,
  group,
})

const mkSeparator = (): SeparatorItem => ({ type: 'separator' })

// ── resolveInitialIndex ────────────────────────────────────────────────────────

test('resolveInitialIndex: empty list returns 0', (t) => {
  t.is(resolveInitialIndex<string>([], 0), 0)
})

test('resolveInitialIndex: returns index when item is enabled', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(resolveInitialIndex(items, 1), 1)
})

test('resolveInitialIndex: clamps negative index to 0', (t) => {
  const items = [mkItem('a'), mkItem('b')]
  t.is(resolveInitialIndex(items, -5), 0)
})

test('resolveInitialIndex: clamps out-of-range index to last', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(resolveInitialIndex(items, 10), 2)
})

test('resolveInitialIndex: skips disabled item at initial index and returns next enabled', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c')]
  t.is(resolveInitialIndex(items, 1), 2)
})

test('resolveInitialIndex: wraps around when forward search reaches end', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c', true)]
  t.is(resolveInitialIndex(items, 1), 0)
})

test('resolveInitialIndex: all disabled returns clamped index', (t) => {
  const items = [mkItem('a', true), mkItem('b', true), mkItem('c', true)]
  t.is(resolveInitialIndex(items, 1), 1)
})

// ── resolveInitialSelection ─────────────────────────────────────────────────────

test('resolveInitialSelection: initialKey matches by key', (t) => {
  const items = [
    { label: 'a', value: 'a', key: 'k-a' },
    { label: 'b', value: 'b', key: 'k-b' },
  ]
  t.is(resolveInitialSelection(items, { initialKey: 'k-b' }), 1)
})

test('resolveInitialSelection: initialKey falls back to String(value) when no key', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(resolveInitialSelection(items, { initialKey: 'b' }), 1)
})

test('resolveInitialSelection: initialValue matches by value', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(resolveInitialSelection(items, { initialValue: 'c' }), 2)
})

test('resolveInitialSelection: initialValue uses reference equality for objects', (t) => {
  const target = { id: 2 }
  const items: Array<Item<{ id: number }>> = [
    { label: 'a', value: { id: 1 }, key: 'a' },
    { label: 'b', value: target, key: 'b' },
  ]
  t.is(resolveInitialSelection(items, { initialValue: target }), 1)
  t.is(
    resolveInitialSelection(items, { initialValue: { id: 2 } }),
    0 // No reference match — falls through to default first-enabled
  )
})

test('resolveInitialSelection: initialKey wins over initialValue and initialIndex', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(
    resolveInitialSelection(items, {
      initialKey: 'c',
      initialValue: 'a',
      initialIndex: 1,
    }),
    2
  )
})

test('resolveInitialSelection: initialValue wins over initialIndex', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(
    resolveInitialSelection(items, { initialValue: 'c', initialIndex: 1 }),
    2
  )
})

test('resolveInitialSelection: falls back to initialIndex when key/value unset', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(resolveInitialSelection(items, { initialIndex: 1 }), 1)
})

test('resolveInitialSelection: matched key on a disabled item skips forward to nearest enabled', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c')]
  t.is(resolveInitialSelection(items, { initialKey: 'b' }), 2)
})

test('resolveInitialSelection: no match and no initialIndex falls back to first enabled', (t) => {
  const items = [mkItem('a', true), mkItem('b'), mkItem('c')]
  t.is(resolveInitialSelection(items, { initialKey: 'nope' }), 1)
})

test('resolveInitialSelection: no match + autoSelectFirstEnabled false returns -1', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(
    resolveInitialSelection(items, {
      initialKey: 'nope',
      autoSelectFirstEnabled: false,
    }),
    -1
  )
})

test('resolveInitialSelection: nothing supplied + autoSelectFirstEnabled false returns -1', (t) => {
  const items = [mkItem('a'), mkItem('b')]
  t.is(resolveInitialSelection(items, { autoSelectFirstEnabled: false }), -1)
})

test('resolveInitialSelection: nothing supplied defaults to first enabled', (t) => {
  const items = [mkItem('a', true), mkItem('b')]
  t.is(resolveInitialSelection(items, {}), 1)
})

test('resolveInitialSelection: empty list returns 0 by default', (t) => {
  t.is(resolveInitialSelection<string>([], {}), 0)
})

test('resolveInitialSelection: empty list + autoSelectFirstEnabled false returns -1', (t) => {
  t.is(
    resolveInitialSelection<string>([], { autoSelectFirstEnabled: false }),
    -1
  )
})

test('resolveInitialSelection: all-disabled with autoSelectFirstEnabled true returns clamped index', (t) => {
  const items = [mkItem('a', true), mkItem('b', true)]
  t.is(resolveInitialSelection(items, {}), 0)
})

test('resolveInitialSelection: all-disabled with autoSelectFirstEnabled false returns -1', (t) => {
  const items = [mkItem('a', true), mkItem('b', true)]
  t.is(resolveInitialSelection(items, { autoSelectFirstEnabled: false }), -1)
})

// ── findNextValidIndex ─────────────────────────────────────────────────────────

test('findNextValidIndex: empty list returns 0', (t) => {
  t.is(findNextValidIndex<string>([], 0, 1), 0)
})

test('findNextValidIndex: steps forward to next enabled item', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 0, 1), 1)
})

test('findNextValidIndex: steps backward to previous enabled item', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 2, -1), 1)
})

test('findNextValidIndex: wraps forward past end', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 2, 1), 0)
})

test('findNextValidIndex: wraps backward past start', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 0, -1), 2)
})

test('findNextValidIndex: skips disabled item when stepping forward', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c')]
  t.is(findNextValidIndex(items, 0, 1), 2)
})

test('findNextValidIndex: skips disabled item when stepping backward', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c')]
  t.is(findNextValidIndex(items, 2, -1), 0)
})

test('findNextValidIndex: all disabled returns currentIndex (stay put)', (t) => {
  const items = [mkItem('a', true), mkItem('b', true), mkItem('c', true)]
  t.is(findNextValidIndex(items, 1, 1), 1)
})

// ── findNextValidIndex (loop=false clamp mode) ─────────────────────────────────

test('findNextValidIndex: loop=false clamps at the last item instead of wrapping', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 2, 1, false), 2)
})

test('findNextValidIndex: loop=false clamps at the first item instead of wrapping', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 0, -1, false), 0)
})

test('findNextValidIndex: loop=false still skips disabled items without wrapping', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c')]
  t.is(findNextValidIndex(items, 0, 1, false), 2)
})

test('findNextValidIndex: loop=false stays put when nothing enabled remains before the boundary', (t) => {
  const items = [mkItem('a'), mkItem('b', true), mkItem('c', true)]
  t.is(findNextValidIndex(items, 0, 1, false), 0)
})

test('findNextValidIndex: loop=true (explicit) matches default wrap behaviour', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findNextValidIndex(items, 2, 1, true), 0)
})

// ── findPageIndex ───────────────────────────────────────────────────────────────

test('findPageIndex: empty list returns 0', (t) => {
  t.is(findPageIndex<string>([], 0, 5, true), 0)
})

test('findPageIndex: steps forward by delta', (t) => {
  const items = Array.from({ length: 10 }, (_, i) => mkItem(String(i)))
  t.is(findPageIndex(items, 2, 3, true), 5)
})

test('findPageIndex: steps backward by |delta| when delta is negative', (t) => {
  const items = Array.from({ length: 10 }, (_, i) => mkItem(String(i)))
  t.is(findPageIndex(items, 5, -3, true), 2)
})

test('findPageIndex: loop=true wraps past the end', (t) => {
  const items = Array.from({ length: 5 }, (_, i) => mkItem(String(i)))
  t.is(findPageIndex(items, 3, 3, true), 1)
})

test('findPageIndex: loop=false clamps at the last item instead of wrapping', (t) => {
  const items = Array.from({ length: 5 }, (_, i) => mkItem(String(i)))
  t.is(findPageIndex(items, 3, 3, false), 4)
})

test('findPageIndex: loop=false clamps at the first item instead of wrapping', (t) => {
  const items = Array.from({ length: 5 }, (_, i) => mkItem(String(i)))
  t.is(findPageIndex(items, 1, -3, false), 0)
})

test('findPageIndex: skips disabled items along the way', (t) => {
  // Hops a(0) -> b(1) -> skips disabled c(2) -> d(3) -> e(4): 3 valid hops lands on e.
  const items = [
    mkItem('a'),
    mkItem('b'),
    mkItem('c', true),
    mkItem('d'),
    mkItem('e'),
  ]
  t.is(findPageIndex(items, 0, 3, true), 4)
})

test('findPageIndex: all disabled returns currentIndex (stay put)', (t) => {
  const items = [mkItem('a', true), mkItem('b', true), mkItem('c', true)]
  t.is(findPageIndex(items, 1, 3, true), 1)
})

// ── findFirstValidIndex ────────────────────────────────────────────────────────

test('findFirstValidIndex: empty list returns -1', (t) => {
  t.is(findFirstValidIndex<string>([]), -1)
})

test('findFirstValidIndex: returns 0 when first item is enabled', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findFirstValidIndex(items), 0)
})

test('findFirstValidIndex: skips disabled first item', (t) => {
  const items = [mkItem('a', true), mkItem('b'), mkItem('c')]
  t.is(findFirstValidIndex(items), 1)
})

test('findFirstValidIndex: all disabled returns -1', (t) => {
  const items = [mkItem('a', true), mkItem('b', true)]
  t.is(findFirstValidIndex(items), -1)
})

// ── findLastValidIndex ─────────────────────────────────────────────────────────

test('findLastValidIndex: empty list returns -1', (t) => {
  t.is(findLastValidIndex<string>([]), -1)
})

test('findLastValidIndex: returns last index when last item is enabled', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c')]
  t.is(findLastValidIndex(items), 2)
})

test('findLastValidIndex: skips disabled last item', (t) => {
  const items = [mkItem('a'), mkItem('b'), mkItem('c', true)]
  t.is(findLastValidIndex(items), 1)
})

test('findLastValidIndex: all disabled returns -1 (matches findFirstValidIndex)', (t) => {
  const items = [mkItem('a', true), mkItem('b', true)]
  t.is(findLastValidIndex(items), -1)
})

test('findLastValidIndex and findFirstValidIndex agree on empty list', (t) => {
  t.is(findLastValidIndex<string>([]), findFirstValidIndex<string>([]))
})

// ── computePageStarts ────────────────────────────────────────────────────────

test('computePageStarts: empty list returns no pages', (t) => {
  t.deepEqual(computePageStarts<string>([], 3), [])
})

test('computePageStarts: falsy limit returns a single page', (t) => {
  const items = [mkItem('a'), mkItem('b')]
  t.deepEqual(computePageStarts(items, 0), [0])
})

test('computePageStarts: ungrouped items paginate by raw item count', (t) => {
  const items = [
    mkItem('a'),
    mkItem('b'),
    mkItem('c'),
    mkItem('d'),
    mkItem('e'),
  ]
  t.deepEqual(computePageStarts(items, 3), [0, 3])
})

test('computePageStarts: budgets one row per header so groups do not overflow limit', (t) => {
  // B9 repro: 4 single-item groups, limit=3 — each page can only fit one
  // header+item pair (2 rows), so every item lands on its own page.
  const items = [
    mkGroupedItem('A', 'G1'),
    mkGroupedItem('B', 'G2'),
    mkGroupedItem('C', 'G3'),
    mkGroupedItem('D', 'G4'),
  ]
  t.deepEqual(computePageStarts(items, 3), [0, 1, 2, 3])
})

test('computePageStarts: fits a full group (header + items) on one page when it fits the limit', (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
    mkGroupedItem('D', 'Second'),
  ]
  // Header(1) + A(1) + B(1) = 3 rows fits limit=3; Second group starts a new page.
  t.deepEqual(computePageStarts(items, 3), [0, 2])
})

test('computePageStarts: a page always has at least one item, even when header+item exceeds limit', (t) => {
  const items = [mkGroupedItem('A', 'Group'), mkGroupedItem('B', 'Group')]
  // Limit=1 can't fit header+item (2 rows), but each page still gets 1 item.
  t.deepEqual(computePageStarts(items, 1), [0, 1])
})

// ── pageStartFor (binary search) ────────────────────────────────────────────

test('pageStartFor: empty pageStarts returns 0', (t) => {
  t.is(pageStartFor([], 5), 0)
})

test('pageStartFor: matches linear scan across exact starts, gaps, index 0, and beyond-last', (t) => {
  const pageStarts = [0, 10, 20, 35, 50]
  const probes = [0, 1, 9, 10, 11, 19, 20, 21, 34, 35, 49, 50, 51, 1000]
  for (const index of probes) {
    t.is(
      pageStartFor(pageStarts, index),
      linearPageStartFor(pageStarts, index),
      `mismatch at index ${index}`
    )
  }
})

test('pageStartFor: index before the first start still returns the first start', (t) => {
  // PageStarts[0] is always 0 in practice, but the helper should still
  // behave sanely (fallback to 0) if probed below the smallest start.
  t.is(pageStartFor([5, 10], 0), 0)
})

test('pageStartFor: single-page array returns that start for any index', (t) => {
  t.is(pageStartFor([0], 0), 0)
  t.is(pageStartFor([0], 999), 0)
})

// ── pageIndexOfStart (binary search) ────────────────────────────────────────

test('pageIndexOfStart: empty pageStarts returns -1', (t) => {
  t.is(pageIndexOfStart([], 0), -1)
})

test('pageIndexOfStart: matches Array#indexOf for exact and missing values', (t) => {
  const pageStarts = [0, 10, 20, 35, 50]
  for (const start of [0, 10, 20, 35, 50, 5, 15, -1, 51]) {
    t.is(
      pageIndexOfStart(pageStarts, start),
      pageStarts.indexOf(start),
      `mismatch at start ${start}`
    )
  }
})

// ── truncateLabel ────────────────────────────────────────────────────────────

test('truncateLabel: label shorter than maxWidth is returned unchanged', (t) => {
  t.is(truncateLabel('short', 10), 'short')
})

test('truncateLabel: label exactly maxWidth is returned unchanged', (t) => {
  t.is(truncateLabel('exact', 5), 'exact')
})

test('truncateLabel: maxWidth unset returns original', (t) => {
  t.is(truncateLabel('a very long label indeed', 0), 'a very long label indeed')
})

test('truncateLabel: negative maxWidth returns original', (t) => {
  t.is(
    truncateLabel('a very long label indeed', -5),
    'a very long label indeed'
  )
})

test('truncateLabel: maxWidth === 1 returns a bare ellipsis', (t) => {
  t.is(truncateLabel('somelonglabel', 1), '…')
})

test('truncateLabel: end mode keeps the start and ellipsizes the tail', (t) => {
  const result = truncateLabel('somelonglabel', 11, 'end')
  t.is(result.length, 11)
  t.true(result.endsWith('…'))
  t.is(result, 'somelongla…')
})

test('truncateLabel: start mode keeps the end and ellipsizes the head', (t) => {
  const result = truncateLabel('somelonglabel', 11, 'start')
  t.is(result.length, 11)
  t.true(result.startsWith('…'))
  t.is(result, '…elonglabel')
})

test('truncateLabel: middle mode keeps both ends', (t) => {
  const result = truncateLabel('somelonglabel', 9, 'middle')
  t.is(result.length, 9)
  t.true(result.includes('…'))
  t.true(result.startsWith('some'))
  t.true(result.endsWith('abel'))
})

test('truncateLabel: middle mode on a file path keeps directory and filename visible', (t) => {
  const result = truncateLabel(
    '/very/long/path/to/some/deeply/nested/file.ts',
    20,
    'middle'
  )
  t.is(result.length, 20)
  t.true(result.includes('…'))
  t.true(result.startsWith('/very/long'))
  t.true(result.endsWith('file.ts'))
})

test('truncateLabel: default mode is end', (t) => {
  t.is(
    truncateLabel('somelonglabel', 11),
    truncateLabel('somelonglabel', 11, 'end')
  )
})

// ── separators ───────────────────────────────────────────────────────────────

test('resolveInitialIndex: skips a separator at the initial index', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkItem('a'),
    mkSeparator(),
    mkItem('c'),
  ]
  t.is(resolveInitialIndex(items, 1), 2)
})

test('resolveInitialIndex: all separators/disabled returns clamped index', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkSeparator(),
    mkItem('a', true),
    mkSeparator(),
  ]
  t.is(resolveInitialIndex(items, 1), 1)
})

test('findNextValidIndex: steps over a separator when moving forward', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkItem('a'),
    mkSeparator(),
    mkItem('c'),
  ]
  t.is(findNextValidIndex(items, 0, 1), 2)
})

test('findNextValidIndex: steps over a separator when moving backward', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkItem('a'),
    mkSeparator(),
    mkItem('c'),
  ]
  t.is(findNextValidIndex(items, 2, -1), 0)
})

test('findFirstValidIndex: skips a leading separator', (t) => {
  const items: Array<ItemOrSeparator<string>> = [mkSeparator(), mkItem('a')]
  t.is(findFirstValidIndex(items), 1)
})

test('findLastValidIndex: skips a trailing separator', (t) => {
  const items: Array<ItemOrSeparator<string>> = [mkItem('a'), mkSeparator()]
  t.is(findLastValidIndex(items), 0)
})

test('computePageStarts: a separator costs exactly one row, same as a plain item', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkItem('a'),
    mkSeparator(),
    mkItem('c'),
  ]
  t.deepEqual(computePageStarts(items, 2), [0, 2])
})

// ── buildNavigableRows ──────────────────────────────────────────────────────

function rowSignature(row: NavRow<string>): string {
  if (isGroupHeaderRow(row)) return `header:${row.group}:${row.collapsed}`
  if ('type' in row && row.type === 'separator') return 'separator'
  return row.label
}

test('buildNavigableRows: ungrouped items pass through with no headers', (t) => {
  const items = [mkItem('a'), mkItem('b')]
  const rows = buildNavigableRows(items, new Set())
  t.deepEqual(
    rows.map((row) => rowSignature(row)),
    ['a', 'b']
  )
})

test('buildNavigableRows: inserts one header per contiguous group boundary', (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
  ]
  const rows = buildNavigableRows(items, new Set())
  t.deepEqual(
    rows.map((row) => rowSignature(row)),
    ['header:First:false', 'A', 'B', 'header:Second:false', 'C']
  )
})

test('buildNavigableRows: a collapsed group renders only its header, items omitted', (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
  ]
  const rows = buildNavigableRows(items, new Set(['First']))
  t.deepEqual(
    rows.map((row) => rowSignature(row)),
    ['header:First:true', 'header:Second:false', 'C']
  )
})

test('buildNavigableRows: non-contiguous occurrences of the same group each get their own header', (t) => {
  const items = [
    mkGroupedItem('A', 'G'),
    mkItem('ungrouped'),
    mkGroupedItem('B', 'G'),
  ]
  const rows = buildNavigableRows(items, new Set())
  t.deepEqual(
    rows.map((row) => rowSignature(row)),
    ['header:G:false', 'A', 'ungrouped', 'header:G:false', 'B']
  )
})

test('buildNavigableRows: separators pass through unaffected by grouping', (t) => {
  const items: Array<ItemOrSeparator<string>> = [
    mkGroupedItem('A', 'G'),
    mkSeparator(),
    mkGroupedItem('B', 'G'),
  ]
  const rows = buildNavigableRows(items, new Set())
  // The separator breaks group continuity — same as computePageStarts —
  // so the second grouped item gets its own header.
  t.deepEqual(
    rows.map((row) => rowSignature(row)),
    ['header:G:false', 'A', 'separator', 'header:G:false', 'B']
  )
})

test('buildNavigableRows: header keys are unique even for repeated group names', (t) => {
  const items = [
    mkGroupedItem('A', 'G'),
    mkItem('ungrouped'),
    mkGroupedItem('B', 'G'),
  ]
  const rows = buildNavigableRows(items, new Set())
  const headerKeys = rows
    .filter((row) => isGroupHeaderRow(row))
    .map((row) => row.key)
  t.is(new Set(headerKeys).size, headerKeys.length)
})

test("buildNavigableRows: a later group's header key is stable across an earlier group's collapse toggle", (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
  ]

  const expandedKey = buildNavigableRows(items, new Set())
    .filter((row) => isGroupHeaderRow(row) && row.group === 'Second')
    .map((row) => (row as { key: string }).key)[0]

  // Collapsing "First" removes its 2 item rows ahead of "Second", changing
  // "Second" header's position in the array — the key must not change with it.
  const collapsedKey = buildNavigableRows(items, new Set(['First']))
    .filter((row) => isGroupHeaderRow(row) && row.group === 'Second')
    .map((row) => (row as { key: string }).key)[0]

  t.is(expandedKey, collapsedKey)
})

// ── computeNavRowPageStarts ──────────────────────────────────────────────────

test('computeNavRowPageStarts: empty navRows returns no pages', (t) => {
  t.deepEqual(computeNavRowPageStarts<string>([], 3), [])
})

test('computeNavRowPageStarts: falsy limit returns a single page', (t) => {
  const rows = buildNavigableRows([mkItem('a'), mkItem('b')], new Set())
  t.deepEqual(computeNavRowPageStarts(rows, 0), [0])
})

test('computeNavRowPageStarts: every row (item or header) costs exactly one, no virtual injection', (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
  ]
  const rows = buildNavigableRows(items, new Set())
  // Rows: [header:First, A, B, header:Second, C] — 5 rows, limit 2 → chunks of 2.
  t.deepEqual(computeNavRowPageStarts(rows, 2), [0, 2, 4])
})

test('computeNavRowPageStarts: a collapsed group is excluded from page starts, not merely uncounted', (t) => {
  const items = [
    mkGroupedItem('A', 'First'),
    mkGroupedItem('B', 'First'),
    mkGroupedItem('C', 'Second'),
    mkGroupedItem('D', 'Second'),
  ]
  const collapsedRows = buildNavigableRows(items, new Set(['First']))
  // Rows: [header:First(collapsed), header:Second, C, D] — 4 rows total,
  // with A/B never present to page over at all.
  t.is(collapsedRows.length, 4)
  t.deepEqual(computeNavRowPageStarts(collapsedRows, 3), [0, 3])
})
