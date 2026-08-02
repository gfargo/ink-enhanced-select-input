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
  hasItems: overrides.hasItems ?? true,
  multiple: overrides.multiple ?? false,
  orientation: overrides.orientation ?? ('vertical' as const),
  selectedIndex: overrides.selectedIndex ?? 0,
  filteredItems: overrides.filteredItems ?? items,
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
