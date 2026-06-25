import test from 'ava'
import {
  findFirstValidIndex,
  findLastValidIndex,
  findNextValidIndex,
  resolveInitialIndex,
  type Item,
} from '../enhanced-select-input/index.js'

const mkItem = (label: string, disabled = false): Item<string> => ({
  label,
  value: label,
  disabled,
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
