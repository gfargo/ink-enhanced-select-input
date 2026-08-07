import test from 'ava'
import {
  computeMatchRanges,
  matchesQuery,
} from '../enhanced-select-input/index.js'

// ── matchesQuery ────────────────────────────────────────────────────────

test('matchesQuery: empty query always matches', (t) => {
  t.true(matchesQuery('Apple', '', 'includes'))
  t.true(matchesQuery('Apple', '', 'fuzzy'))
})

test('matchesQuery: includes is a case-insensitive substring match', (t) => {
  t.true(matchesQuery('Apple', 'app', 'includes'))
  t.true(matchesQuery('Apple', 'APP', 'includes'))
  t.false(matchesQuery('Apple', 'xyz', 'includes'))
})

test('matchesQuery: fuzzy matches an ordered, non-contiguous subsequence', (t) => {
  t.true(matchesQuery('Apple', 'ae', 'fuzzy'))
  t.true(matchesQuery('Grape', 'ae', 'fuzzy'))
  t.false(matchesQuery('Banana', 'ae', 'fuzzy'))
})

test('matchesQuery: fuzzy is case-insensitive', (t) => {
  t.true(matchesQuery('Apple', 'AE', 'fuzzy'))
})

test('matchesQuery: fuzzy requires query characters in order', (t) => {
  t.false(matchesQuery('Apple', 'ea', 'fuzzy'))
})

// ── computeMatchRanges ──────────────────────────────────────────────────

test('computeMatchRanges: empty query returns no ranges', (t) => {
  t.deepEqual(computeMatchRanges('Apple', '', 'includes'), [])
  t.deepEqual(computeMatchRanges('Apple', '', 'fuzzy'), [])
})

test('computeMatchRanges: no match returns no ranges', (t) => {
  t.deepEqual(computeMatchRanges('Apple', 'xyz', 'includes'), [])
  t.deepEqual(computeMatchRanges('Banana', 'ae', 'fuzzy'), [])
})

test('computeMatchRanges: includes returns a single range at the substring position', (t) => {
  t.deepEqual(computeMatchRanges('Apple', 'ppl', 'includes'), [[1, 4]])
})

test('computeMatchRanges: includes is case-insensitive', (t) => {
  t.deepEqual(computeMatchRanges('Apple', 'PPL', 'includes'), [[1, 4]])
})

test('computeMatchRanges: fuzzy merges adjacent matched characters into one range', (t) => {
  // "Apple" query "ap" matches indices 0,1 — adjacent, so merged into one range.
  t.deepEqual(computeMatchRanges('Apple', 'ap', 'fuzzy'), [[0, 2]])
})

test('computeMatchRanges: fuzzy produces separate ranges for non-adjacent matches', (t) => {
  // "Apple" query "ae" matches 'a' at 0 and 'e' at 4 — not adjacent.
  t.deepEqual(computeMatchRanges('Apple', 'ae', 'fuzzy'), [
    [0, 1],
    [4, 5],
  ])
})

test('computeMatchRanges: fuzzy is case-insensitive', (t) => {
  t.deepEqual(computeMatchRanges('Apple', 'AE', 'fuzzy'), [
    [0, 1],
    [4, 5],
  ])
})
