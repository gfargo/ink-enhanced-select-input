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

test('matchesQuery: fuzzy matches astral characters (surrogate pairs)', (t) => {
  // 🍎 (U+1F34E) is encoded as a UTF-16 surrogate pair — the query character
  // must compare by code point, not by code unit, to match at all.
  t.true(matchesQuery('🍎Apple', '🍎a', 'fuzzy'))
  t.true(matchesQuery('🍎Apple', '🍎', 'fuzzy'))
  t.false(matchesQuery('Apple', '🍎', 'fuzzy'))
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

test('computeMatchRanges: fuzzy produces slice-correct ranges for astral characters', (t) => {
  // 🍎 occupies two UTF-16 code units, so its matched range must span both —
  // a range of [0, 1] would slice the string in the middle of the surrogate
  // pair and produce an unpaired half. Here it's immediately followed by a
  // match at index 2, so the two merge into one [0, 3) range.
  const text = '🍎Apple'
  const ranges = computeMatchRanges(text, '🍎a', 'fuzzy')
  t.deepEqual(ranges, [[0, 3]])
  t.is(text.slice(...ranges[0]!), '🍎A')
})

test('computeMatchRanges: fuzzy keeps non-adjacent astral and BMP matches as separate ranges', (t) => {
  const text = '🍎Apple'
  const ranges = computeMatchRanges(text, '🍎e', 'fuzzy')
  t.deepEqual(ranges, [
    [0, 2],
    [6, 7],
  ])
  t.is(text.slice(...ranges[0]!), '🍎')
  t.is(text.slice(...ranges[1]!), 'e')
})

// ── computeMatchRanges: toLowerCase() length changes (İ U+0130) ──────────

test('computeMatchRanges: includes ranges are slice-correct when toLowerCase() expands a character', (t) => {
  // U+0130 (İ) lowercases to 'i' + combining dot above (U+0307) — two units
  // from one — so normalized-space offsets no longer line up with `text`.
  const text = 'İstanbul'
  const ranges = computeMatchRanges(text, 'stan', 'includes')
  t.deepEqual(ranges, [[1, 5]])
  t.is(text.slice(...ranges[0]!), 'stan')
})

test('computeMatchRanges: fuzzy ranges are slice-correct when toLowerCase() expands a character', (t) => {
  const text = 'İstanbul'
  const ranges = computeMatchRanges(text, 'sta', 'fuzzy')
  t.deepEqual(ranges, [[1, 4]])
  t.is(text.slice(...ranges[0]!), 'sta')
})

test('computeMatchRanges: includes range is slice-correct when the expanding character is inside the match', (t) => {
  const text = 'Diyarbakİr'
  const ranges = computeMatchRanges(text, 'kİr', 'includes')
  t.deepEqual(ranges, [[7, 10]])
  t.is(text.slice(...ranges[0]!), 'kİr')
})

test('computeMatchRanges: stays in bounds when the query itself expands under toLowerCase()', (t) => {
  // 'İ'.toLowerCase() is 2 units; naively using normalizedQuery.length as the
  // original span would previously have produced an out-of-range end.
  const ranges = computeMatchRanges('istanbul', 'İ', 'includes')
  t.true(Array.isArray(ranges))
  for (const [start, end] of ranges) {
    t.true(start >= 0)
    t.true(end <= 'istanbul'.length)
    t.true(start < end)
  }
})

test('computeMatchRanges: fuzzy collapses duplicate normalized matches into one non-overlapping range', (t) => {
  // Both units of İ's lowercase form ('i' + combining dot) map back to the
  // same original character — the merge logic must absorb, not overlap.
  const text = 'İstanbul'
  const ranges = computeMatchRanges(text, 'i̇', 'fuzzy')
  t.deepEqual(ranges, [[0, 1]])
  t.is(text.slice(...ranges[0]!), 'İ')
})

test('computeMatchRanges: parity with matchesQuery for Greek final sigma', (t) => {
  // 'ΟΔΟΣ'.toLowerCase() is 'οδος' (final sigma becomes regular sigma) — a
  // per-character lowercase would instead produce 'οδοσ' and break this.
  const cases: Array<[string, string, 'includes' | 'fuzzy']> = [
    ['ΟΔΟΣ', 'ος', 'includes'],
    ['ΟΔΟΣ', 'ος', 'fuzzy'],
    ['Apple', 'ppl', 'includes'],
    ['Apple', 'xyz', 'includes'],
  ]
  for (const [text, query, mode] of cases) {
    t.is(
      matchesQuery(text, query, mode),
      computeMatchRanges(text, query, mode).length > 0
    )
  }
})
