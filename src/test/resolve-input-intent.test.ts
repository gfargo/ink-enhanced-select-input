import test from 'ava'
import { type Key } from 'ink'
import {
  resolveInputIntent,
  type InputIntentContext,
  type Item,
  type KeyMap,
} from '../enhanced-select-input/index.js'

const noKey: Key = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  home: false,
  end: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  super: false,
  hyper: false,
  capsLock: false,
  numLock: false,
}

const key = (overrides: Partial<Key> = {}): Key => ({ ...noKey, ...overrides })

const allKeyMapEnabled: Required<KeyMap> = {
  arrows: true,
  vimKeys: true,
  homeEnd: true,
  cancel: true,
  select: true,
  toggle: true,
  bulk: true,
  hotkeys: true,
  search: true,
}

const items: Array<Item<string>> = [
  { key: 'a', label: 'Alpha', value: 'a', hotkey: 'j' },
  { key: 'b', label: 'Beta', value: 'b' },
  { key: 'c', label: 'Gamma', value: 'c', disabled: true },
]

type ContextOverrides = Partial<
  Omit<InputIntentContext<string>, 'km'> & { km: Partial<KeyMap> }
>

const context = (
  overrides: ContextOverrides = {}
): InputIntentContext<string> => ({
  km: { ...allKeyMapEnabled, ...overrides.km },
  searchable: overrides.searchable ?? false,
  searchQuery: overrides.searchQuery ?? '',
  searchCursor: overrides.searchCursor ?? (overrides.searchQuery ?? '').length,
  hasItems: overrides.hasItems ?? true,
  multiple: overrides.multiple ?? false,
  orientation: overrides.orientation ?? ('vertical' as const),
  selectedIndex: overrides.selectedIndex ?? 0,
  filteredItems: overrides.filteredItems ?? items,
  typeahead: overrides.typeahead ?? false,
  typeaheadActive: overrides.typeaheadActive ?? false,
})

// Search-edit keys (backspace/delete/clear-escape) win over everything else,
// including a jump key or an item hotkey with the same character.
test('searchable backspace beats navigation and hotkey resolution', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ backspace: true, home: true }),
    context({ searchable: true, searchQuery: 'a' })
  )
  t.deepEqual(intent, { type: 'search-backspace' })
})

test('searchable escape with a query clears search rather than cancelling', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ escape: true }),
    context({ searchable: true, searchQuery: 'a', km: { cancel: true } })
  )
  t.deepEqual(intent, { type: 'search-clear' })
})

test('escape with an empty query still cancels in searchable mode', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ escape: true }),
    context({ searchable: true, searchQuery: '' })
  )
  t.deepEqual(intent, { type: 'cancel' })
})

test('no items and not searchable resolves to none even for a nav key', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ downArrow: true }),
    context({ hasItems: false, filteredItems: [] })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('home jumps to the first non-disabled index, skipping a disabled leader', (t) => {
  const leadingDisabled: Array<Item<string>> = [
    { key: 'a', label: 'Alpha', value: 'a', disabled: true },
    { key: 'b', label: 'Beta', value: 'b' },
    { key: 'c', label: 'Gamma', value: 'c' },
  ]
  const intent = resolveInputIntent(
    '',
    key({ home: true }),
    context({ filteredItems: leadingDisabled, selectedIndex: 2 })
  )
  t.deepEqual(intent, { type: 'jump', index: 1 })
})

test('home/end are no-ops when km.homeEnd is disabled', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ home: true }),
    context({ km: { homeEnd: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('escape cancels ahead of navigation when km.cancel is enabled', (t) => {
  const intent = resolveInputIntent('', key({ escape: true }), context())
  t.deepEqual(intent, { type: 'cancel' })
})

test('escape is a no-op when km.cancel is disabled', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ escape: true }),
    context({ km: { cancel: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('space toggles only in multi-select, non-searchable mode', (t) => {
  const intent = resolveInputIntent(' ', key(), context({ multiple: true }))
  t.deepEqual(intent, { type: 'toggle' })
})

test('space is treated as search input, not toggle, when searchable', (t) => {
  const intent = resolveInputIntent(
    ' ',
    key(),
    context({ multiple: true, searchable: true })
  )
  t.deepEqual(intent, { type: 'search-append', char: ' ' })
})

test('arrow-down navigation takes priority over a same-character hotkey', (t) => {
  const intent = resolveInputIntent('', key({ downArrow: true }), context())
  t.deepEqual(intent, {
    type: 'navigate',
    index: 1,
  })
})

test('vim key navigation beats an identical-character item hotkey', (t) => {
  // "j" is both the vertical down-vim-key and item `a`'s hotkey — the active
  // vim key must win so navigation isn't shadowed by hotkey matching.
  const intent = resolveInputIntent('j', key(), context())
  t.deepEqual(intent, { type: 'navigate', index: 1 })
})

// B14 regression: arrow keys report `input === ''`, which also equals an
// unset `hotkey: ''` on an item. Navigation must resolve first so that
// empty-hotkey items never fire on a bare arrow keypress.
test('arrow-down navigation does not fire an empty-string item hotkey (B14)', (t) => {
  const emptyHotkeyItems: Array<Item<string>> = [
    { key: 'a', label: 'Alpha', value: 'a', hotkey: '' },
    { key: 'b', label: 'Beta', value: 'b' },
  ]
  const intent = resolveInputIntent(
    '',
    key({ downArrow: true }),
    context({ filteredItems: emptyHotkeyItems })
  )
  t.deepEqual(intent, { type: 'navigate', index: 1 })
})

test('home/end jump does not fire an empty-string item hotkey (B14)', (t) => {
  const emptyHotkeyItems: Array<Item<string>> = [
    { key: 'a', label: 'Alpha', value: 'a', hotkey: '' },
    { key: 'b', label: 'Beta', value: 'b' },
  ]
  const intent = resolveInputIntent(
    '',
    key({ end: true }),
    context({ filteredItems: emptyHotkeyItems, selectedIndex: 0 })
  )
  t.deepEqual(intent, { type: 'jump', index: 1 })
})

// B14 regression: with km.arrows disabled, a physical arrow keypress still
// reports `input === ''` but resolveNavigateIntent no longer intercepts it
// (no mapped step), so execution reaches hotkey resolution directly. An
// empty-string item hotkey must not match here either.
test('empty-string item hotkey never fires when arrow navigation is disabled (B14)', (t) => {
  const emptyHotkeyItems: Array<Item<string>> = [
    { key: 'a', label: 'Alpha', value: 'a', hotkey: '' },
    { key: 'b', label: 'Beta', value: 'b' },
  ]
  const intent = resolveInputIntent(
    '',
    key({ downArrow: true }),
    context({ filteredItems: emptyHotkeyItems, km: { arrows: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('return submits when select is enabled and no earlier branch matched', (t) => {
  const intent = resolveInputIntent('', key({ return: true }), context())
  t.deepEqual(intent, { type: 'submit' })
})

test('return does nothing when km.select is disabled', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ return: true }),
    context({ km: { select: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('printable characters are captured as search input when searchable', (t) => {
  const intent = resolveInputIntent('z', key(), context({ searchable: true }))
  t.deepEqual(intent, { type: 'search-append', char: 'z' })
})

test('ctrl/meta-modified characters are not captured as search input', (t) => {
  const intent = resolveInputIntent(
    'z',
    key({ ctrl: true }),
    context({ searchable: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('hotkey resolves to the matching, non-disabled item', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({ km: { vimKeys: false } })
  )
  t.deepEqual(intent, { type: 'hotkey', item: items[0], index: 0 })
})

test('hotkeys are disabled in multi-select mode', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({ km: { vimKeys: false }, multiple: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('hotkeys are disabled in searchable mode', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({ km: { vimKeys: false }, searchable: true })
  )
  t.deepEqual(intent, { type: 'search-append', char: 'j' })
})

// --- F7: bulk selection chords (Ctrl+A / Ctrl+D / Ctrl+R) ---

test('ctrl+a resolves to select-all in multi-select mode', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ ctrl: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'select-all' })
})

test('ctrl+d resolves to select-none in multi-select mode', (t) => {
  const intent = resolveInputIntent(
    'd',
    key({ ctrl: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'select-none' })
})

test('ctrl+r resolves to invert in multi-select mode', (t) => {
  const intent = resolveInputIntent(
    'r',
    key({ ctrl: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'invert' })
})

test('bulk chords are no-ops outside multi-select mode', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ ctrl: true }),
    context({ multiple: false })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('bulk chords are no-ops when km.bulk is disabled', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ ctrl: true }),
    context({ multiple: true, km: { bulk: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('bulk chords still resolve in searchable multi-select mode (chords are excluded from search-append)', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ ctrl: true }),
    context({ multiple: true, searchable: true })
  )
  t.deepEqual(intent, { type: 'select-all' })
})

test('an unmodified "a" is not treated as a bulk chord', (t) => {
  const intent = resolveInputIntent(
    'a',
    key(),
    context({ multiple: true, searchable: true })
  )
  t.deepEqual(intent, { type: 'search-append', char: 'a' })
})

test('alt+a is not a bulk chord (bulk is Ctrl-only)', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ meta: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('alt+d is not a bulk chord (bulk is Ctrl-only)', (t) => {
  const intent = resolveInputIntent(
    'd',
    key({ meta: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('alt+r is not a bulk chord (bulk is Ctrl-only)', (t) => {
  const intent = resolveInputIntent(
    'r',
    key({ meta: true }),
    context({ multiple: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('alt+a in searchable multi-select mode is not a bulk chord and is not appended to search (still excluded as a modified chord)', (t) => {
  const intent = resolveInputIntent(
    'a',
    key({ meta: true }),
    context({ multiple: true, searchable: true })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('km.hotkeys disabled leaves Enter/select working', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ return: true }),
    context({ km: { hotkeys: false } })
  )
  t.deepEqual(intent, { type: 'submit' })
})

test('km.hotkeys disabled turns a hotkey char into a no-op', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({ km: { hotkeys: false, vimKeys: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

test('km.select disabled leaves item hotkeys working', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({ km: { select: false, vimKeys: false } })
  )
  t.deepEqual(intent, { type: 'hotkey', item: items[0], index: 0 })
})

test('km.hotkeys disabled with typeahead lets a hotkey char be captured as typeahead', (t) => {
  const intent = resolveInputIntent(
    'j',
    key(),
    context({
      km: { hotkeys: false, vimKeys: false },
      typeahead: true,
    })
  )
  t.deepEqual(intent, { type: 'typeahead', char: 'j' })
})

test('km.search disabled stops printable characters from being captured in searchable mode', (t) => {
  const intent = resolveInputIntent(
    'z',
    key(),
    context({ searchable: true, km: { search: false } })
  )
  t.deepEqual(intent, { type: 'none' })
})

// --- Search-line cursor movement (F3: search field ergonomics) ---

test('searchable left/right arrows move the search cursor in vertical orientation', (t) => {
  const left = resolveInputIntent(
    '',
    key({ leftArrow: true }),
    context({ searchable: true, searchQuery: 'ab', searchCursor: 1 })
  )
  t.deepEqual(left, { type: 'search-cursor-left' })

  const right = resolveInputIntent(
    '',
    key({ rightArrow: true }),
    context({ searchable: true, searchQuery: 'ab', searchCursor: 1 })
  )
  t.deepEqual(right, { type: 'search-cursor-right' })
})

test('left/right arrows are not claimed by search-cursor resolution when not searchable', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ leftArrow: true }),
    context({ searchable: false })
  )
  // Vertical orientation has no left/right list navigation either, so this
  // remains a no-op — the point of this test is that it is NOT a
  // search-cursor intent.
  t.deepEqual(intent, { type: 'none' })
})

test('searchable Home/End move the search cursor, not the list, in vertical orientation', (t) => {
  const home = resolveInputIntent(
    '',
    key({ home: true }),
    context({ searchable: true, searchQuery: 'ab', searchCursor: 2 })
  )
  t.deepEqual(home, { type: 'search-cursor-home' })

  const end = resolveInputIntent(
    '',
    key({ end: true }),
    context({ searchable: true, searchQuery: 'ab', searchCursor: 0 })
  )
  t.deepEqual(end, { type: 'search-cursor-end' })
})

test('searchable Home/End fall back to list-jump in horizontal orientation', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ home: true }),
    context({ searchable: true, orientation: 'horizontal' })
  )
  t.deepEqual(intent, { type: 'jump', index: 0 })
})

test('searchable left/right arrows fall back to list-navigate in horizontal orientation', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ rightArrow: true }),
    context({ searchable: true, orientation: 'horizontal' })
  )
  t.deepEqual(intent, { type: 'navigate', index: 1 })
})

test('Ctrl+A/Ctrl+E move the search cursor to start/end regardless of orientation', (t) => {
  const start = resolveInputIntent(
    'a',
    key({ ctrl: true }),
    context({
      searchable: true,
      searchQuery: 'ab',
      searchCursor: 2,
      orientation: 'horizontal',
    })
  )
  t.deepEqual(start, { type: 'search-cursor-home' })

  const end = resolveInputIntent(
    'e',
    key({ ctrl: true }),
    context({ searchable: true, searchQuery: 'ab', searchCursor: 0 })
  )
  t.deepEqual(end, { type: 'search-cursor-end' })
})

test('Ctrl+W deletes the word before the cursor', (t) => {
  const intent = resolveInputIntent(
    'w',
    key({ ctrl: true }),
    context({ searchable: true, searchQuery: 'foo bar', searchCursor: 7 })
  )
  t.deepEqual(intent, { type: 'search-delete-word' })
})

test('Ctrl+U kills the query up to the cursor', (t) => {
  const intent = resolveInputIntent(
    'u',
    key({ ctrl: true }),
    context({ searchable: true, searchQuery: 'foo bar', searchCursor: 4 })
  )
  t.deepEqual(intent, { type: 'search-kill-to-start' })
})

test('Ctrl+W/Ctrl+U are not mistaken for search-append', (t) => {
  const w = resolveInputIntent(
    'w',
    key({ ctrl: true }),
    context({ searchable: true, searchQuery: 'foo' })
  )
  t.notDeepEqual(w, { type: 'search-append', char: 'w' })

  const u = resolveInputIntent(
    'u',
    key({ ctrl: true }),
    context({ searchable: true, searchQuery: 'foo' })
  )
  t.notDeepEqual(u, { type: 'search-append', char: 'u' })
})

test('search-cursor intents are not resolved when not searchable, even with matching keys', (t) => {
  const ctrlW = resolveInputIntent(
    'w',
    key({ ctrl: true }),
    context({ searchable: false })
  )
  t.deepEqual(ctrlW, { type: 'none' })

  const home = resolveInputIntent('', key({ home: true }), context())
  t.deepEqual(home, { type: 'jump', index: 0 })
})

test('backspace still beats search-cursor and navigation resolution', (t) => {
  const intent = resolveInputIntent(
    '',
    key({ backspace: true, leftArrow: true }),
    context({ searchable: true, searchQuery: 'a', searchCursor: 1 })
  )
  t.deepEqual(intent, { type: 'search-backspace' })
})
