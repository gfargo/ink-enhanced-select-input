import test from 'ava'
import {
  computePageStarts,
  findFirstValidIndex,
  findLastValidIndex,
  findNextValidIndex,
  findPageIndex,
  pageIndexOfStart,
  pageStartFor,
  resolveInitialIndex,
  type Item,
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
