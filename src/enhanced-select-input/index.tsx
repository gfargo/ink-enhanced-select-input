import { Box, Text, useInput, type Key } from 'ink'
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react'

export type Item<V> = {
  /**
   * Unique key for React rendering. Required when V is a non-primitive type
   * (e.g. object) — without it, String(value) produces "[object Object]" for
   * every item, causing duplicate React key warnings and rendering bugs.
   */
  key?: string
  label: string
  value: V
  hotkey?: string
  /**
   * Custom indicator shown only for the highlighted item in single-select
   * mode. Ignored when `multiple` is true — the built-in checkbox indicator
   * takes precedence there (a dev warning is logged if both are supplied).
   * To customize the indicator in multi-select mode, use
   * `indicatorComponent` instead.
   */
  indicator?: React.ReactNode
  disabled?: boolean
  /**
   * Group name for this item. Items sharing the same group value are visually
   * grouped under a header row. Headers are non-navigable.
   */
  group?: string
}

/**
 * Fine-grained control over which key groups the component reacts to.
 *
 * Because Ink does not support event propagation stopping, every `useInput`
 * handler in the app receives every keypress simultaneously. If your
 * application already binds one of these keys globally, set the corresponding
 * flag to `false` so the component ignores it without interfering with your
 * own handler.
 *
 * All groups default to `true` (enabled). Only the keys you explicitly set to
 * `false` are disabled — the rest keep their default behaviour.
 *
 * @example
 * // Disable vim keys — j/k/h/l are used by the parent app
 * <EnhancedSelectInput keyMap={{ vimKeys: false }} ... />
 *
 * // Disable Escape — the parent handles cancel itself
 * <EnhancedSelectInput keyMap={{ cancel: false }} ... />
 *
 * // Disable both vim keys and Home/End
 * <EnhancedSelectInput keyMap={{ vimKeys: false, homeEnd: false }} ... />
 */
export type KeyMap = {
  /** Arrow key navigation (↑ ↓ ← →). Default: true. */
  readonly arrows?: boolean
  /** Vim-style navigation keys (j/k in vertical, h/l in horizontal). Default: true. */
  readonly vimKeys?: boolean
  /** Home / End jump-to-boundary keys. Default: true. */
  readonly homeEnd?: boolean
  /** Escape → onCancel. Default: true. */
  readonly cancel?: boolean
  /** Enter → onSelect / onConfirm. Default: true. */
  readonly select?: boolean
  /** Space toggle in multi-select mode. Default: true. */
  readonly toggle?: boolean
  /**
   * Bulk selection chords in multi-select mode: `Ctrl+A` select-all,
   * `Ctrl+D` select-none, `Ctrl+R` invert. Default: true.
   */
  readonly bulk?: boolean
  /**
   * Item hotkeys (single-char item selection, e.g. `hotkey: 'q'`). Independent
   * of `select` — disabling `select` only turns off Enter, and disabling
   * `hotkeys` only turns off item hotkeys. Default: true.
   */
  readonly hotkeys?: boolean
  /**
   * Printable-character capture in searchable mode. Default: true.
   */
  readonly search?: boolean
}

/** Props accepted by the useEnhancedSelectInput hook (all behaviour, no rendering). */
export type UseEnhancedSelectInputProperties<V> = {
  readonly items: Array<Item<V>>
  readonly isFocused?: boolean
  readonly initialIndex?: number
  /**
   * Max number of visible rows — items and group headers count, but each
   * counts as exactly one row regardless of label length. `limit` bounds row
   * *count*, not terminal width: `DefaultItemComponent` and
   * `DefaultGroupHeaderComponent` both truncate an overlong label with an
   * ellipsis (`wrap="truncate-end"`) rather than letting Ink wrap it onto
   * extra lines, so the rendered height stays `limit` rows. A custom
   * `itemComponent` or `groupHeaderComponent` renders its own `<Text>` and
   * is responsible for its own truncation/wrap behaviour — an unbounded
   * `wrap="wrap"` there can still exceed `limit` rows on narrow terminals.
   */
  readonly limit?: number
  readonly onSelect?: (item: Item<V>) => void
  readonly onHighlight?: (item: Item<V>) => void
  /** Called when Escape is pressed while the component is focused. */
  readonly onCancel?: () => void
  readonly orientation?: 'vertical' | 'horizontal'
  /** Enable multi-select mode. Space toggles, Enter confirms. */
  readonly multiple?: boolean
  /**
   * Pre-selected item keys in multi-select mode.
   * Each entry should match an item's `key` field (or `String(value)` fallback).
   */
  readonly defaultSelectedKeys?: string[]
  /**
   * Called when the user confirms a multi-select (Enter).
   * Only used when `multiple` is true.
   */
  readonly onConfirm?: (items: Array<Item<V>>) => void
  /**
   * Which set of items `onConfirm` draws from in multi-select mode.
   * 'all' (default) confirms every checked item even if hidden by the
   * active search filter; 'filtered' confirms only checked items that
   * currently match the search query. Only used when `multiple` is true.
   */
  readonly confirmScope?: 'all' | 'filtered'
  /**
   * Called each time an item is toggled in multi-select mode (Space).
   * Receives the toggled item and whether it is now checked.
   */
  readonly onToggle?: (item: Item<V>, checked: boolean) => void
  /**
   * Minimum number of checked items required for `onConfirm` to fire in
   * multi-select mode. `Enter` is a no-op while the checked count is below
   * this threshold. Only used when `multiple` is true.
   */
  readonly minSelections?: number
  /**
   * Maximum number of items that may be checked at once in multi-select
   * mode. `toggle` (and bulk select-all/invert) refuse to check additional
   * items once this many are checked; unchecking is always allowed. Only
   * used when `multiple` is true.
   */
  readonly maxSelections?: number
  /**
   * Enable searchable/filterable mode. When true, printable characters
   * build a search query that filters items by label. Hotkeys and vim
   * navigation keys are disabled in this mode.
   */
  readonly searchable?: boolean
  /**
   * Selectively disable built-in key groups to avoid conflicts with
   * keybindings registered elsewhere in your application.
   * See {@link KeyMap} for available groups and defaults.
   */
  readonly keyMap?: KeyMap
  /** Enable type-ahead jump in non-searchable mode. Ignored when `searchable`. Default: false. */
  readonly typeahead?: boolean
  /** Idle window (ms) after which the type-ahead buffer resets. Default: 500. */
  readonly typeaheadTimeout?: number
}

/**
 * Colors used by the default render components. Any slot left unset falls
 * back to the built-in default (which reproduces the component's original,
 * pre-theming appearance). Set a slot to `undefined` explicitly to disable
 * that color. This shape may grow over time — treat it as append-only.
 */
export type Theme = {
  /** Color of the cursor/indicator and label for the highlighted item. Default: 'green'. */
  readonly selected?: string
  /** Color of disabled item labels. Default: 'gray'. */
  readonly disabled?: string
  /** Color of group header text. Default: undefined (dim only). */
  readonly groupHeader?: string
  /** Color of the trailing hotkey hint, e.g. "(a)". Default: 'gray'. */
  readonly hotkey?: string
  /** Color of the ▲/▼/◀/▶ scroll indicators. Default: undefined (dim only). */
  readonly scrollIndicator?: string
  /** Color of the search query/placeholder text. Default: undefined (dim only). */
  readonly searchPlaceholder?: string
}

/** Every {@link Theme} color slot, always present (possibly `undefined`). */
type ThemeColors = {
  readonly selected: string | undefined
  readonly disabled: string | undefined
  readonly groupHeader: string | undefined
  readonly hotkey: string | undefined
  readonly scrollIndicator: string | undefined
  readonly searchPlaceholder: string | undefined
}

/** Fully-resolved theme — every color slot present, plus whether dim styling is active. */
type ResolvedTheme = ThemeColors & { readonly dim: boolean }

/** Full component props — hook props plus rendering customisation. */
export type Properties<V> = UseEnhancedSelectInputProperties<V> & {
  readonly indicatorComponent?: FC<IndicatorProperties>
  readonly itemComponent?: FC<ItemProperties>
  readonly groupHeaderComponent?: FC<GroupHeaderProperties>
  /**
   * Show ▲/▼ (vertical) or ◀/▶ (horizontal) indicators with item counts
   * when the limit window doesn't cover the full list. Only meaningful when
   * `limit` is set. Defaults to false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly showScrollIndicators?: boolean
  /** Placeholder text shown in the search input when the query is empty. */
  readonly searchPlaceholder?: string
  /** Glyph shown for a checked item in multi-select mode. Default: `'[x]'`. */
  readonly checkedIndicator?: string
  /** Glyph shown for an unchecked item in multi-select mode. Default: `'[ ]'`. */
  readonly uncheckedIndicator?: string
  /**
   * Render a "N selected" line above the list in multi-select mode. Shows a
   * `/max` (or `/min`) hint when the corresponding prop is set. Default: false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly showSelectionCount?: boolean
  /**
   * Override the colors used by the default render components. Omitted
   * slots keep their default value. Automatically disabled when the
   * `NO_COLOR` environment variable is set. See {@link Theme}.
   */
  readonly theme?: Partial<Theme>
}

export type IndicatorProperties = {
  readonly isSelected: boolean
  /** True when the item is checked in multi-select mode. Undefined in single-select mode. */
  readonly isChecked?: boolean
  // eslint-disable-next-line react/no-unused-prop-types
  readonly item: Item<unknown>
  /** Glyph shown when `isChecked` is true. Falls back to `'[x]'`. */
  readonly checkedIndicator?: string
  /** Glyph shown when `isChecked` is false. Falls back to `'[ ]'`. */
  readonly uncheckedIndicator?: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

export type ItemProperties = {
  readonly isSelected: boolean
  readonly label: string
  readonly isDisabled: boolean
  /** True when the item is checked in multi-select mode. Undefined in single-select mode. */
  // eslint-disable-next-line react/no-unused-prop-types
  readonly isChecked?: boolean
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

export type GroupHeaderProperties = {
  readonly label: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

// Vim navigation keys that take precedence over hotkeys.
// An item hotkey that matches one of these values will never fire in the
// corresponding orientation — document this constraint at the call site.
const VERTICAL_NAV_KEYS = new Set(['j', 'k'])
const HORIZONTAL_NAV_KEYS = new Set(['h', 'l'])

export function resolveInitialIndex<V>(
  items: Array<Item<V>>,
  initialIndex: number
): number {
  if (items.length === 0) return 0
  const clamped = Math.max(0, Math.min(initialIndex, items.length - 1))
  if (!items[clamped]?.disabled) return clamped
  // Search forward for the nearest enabled item, wrapping around
  for (let i = 1; i < items.length; i++) {
    const nextIndex = (clamped + i) % items.length
    if (!items[nextIndex]?.disabled) return nextIndex
  }

  return clamped
}

export function findNextValidIndex<V>(
  items: Array<Item<V>>,
  currentIndex: number,
  step: number
): number {
  const itemCount = items.length
  if (itemCount === 0) return 0

  let nextIndex = currentIndex

  for (let i = 0; i < itemCount; i++) {
    nextIndex = (nextIndex + step + itemCount) % itemCount
    if (!items[nextIndex]?.disabled) {
      return nextIndex
    }
  }

  // All items are disabled — stay put
  return currentIndex
}

export function findFirstValidIndex<V>(items: Array<Item<V>>): number {
  for (const [i, item] of items.entries()) {
    if (!item?.disabled) return i
  }

  return -1
}

export function findLastValidIndex<V>(items: Array<Item<V>>): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]?.disabled) return i
  }

  return -1
}

/**
 * Splits `items` into pagination windows ("pages") whose rendered row count
 * — items plus the group headers that would be injected before them — never
 * exceeds `limit`. Mirrors the render layer's header logic exactly: a group
 * header is charged to a page whenever the item starts a new group relative
 * to the *previous item in that same page* (the first item of a page always
 * gets its header, since there's no preceding visible item to compare to).
 *
 * Every page contains at least one item, even if that item's own header+item
 * cost exceeds `limit` — a page can never be empty.
 */
export function computePageStarts<V>(
  items: Array<Item<V>>,
  limit: number
): number[] {
  if (items.length === 0) return []
  if (!limit || limit <= 0) return [0]

  const starts: number[] = [0]
  let pageStart = 0
  let running = 0
  let placedInPage = 0

  for (let i = 0; i < items.length; i++) {
    const previousGroup = i === pageStart ? undefined : items[i - 1]?.group
    const headerCost =
      items[i]?.group && items[i]?.group !== previousGroup ? 1 : 0
    const cost = headerCost + 1

    if (placedInPage > 0 && running + cost > limit) {
      pageStart = i
      starts.push(pageStart)
      const newHeaderCost = items[i]?.group ? 1 : 0
      running = newHeaderCost + 1
      placedInPage = 1
      continue
    }

    running += cost
    placedInPage += 1
  }

  return starts
}

/**
 * Largest page-start index in `pageStarts` that is `<= index`.
 * Binary search — `pageStarts` is always strictly ascending (see
 * `computePageStarts`), so per-render lookup cost is O(log pages) rather
 * than O(pages), keeping navigation cheap even over very large lists.
 */
export function pageStartFor(pageStarts: number[], index: number): number {
  let low = 0
  let high = pageStarts.length - 1
  let result = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = pageStarts[mid]!
    if (candidate <= index) {
      result = candidate
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return result
}

/**
 * Index within `pageStarts` of the entry exactly equal to `start`, or `-1`
 * if no such entry exists. Binary search counterpart to `Array#indexOf` for
 * the same strictly-ascending array.
 */
export function pageIndexOfStart(pageStarts: number[], start: number): number {
  let low = 0
  let high = pageStarts.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = pageStarts[mid]!
    if (candidate === start) return mid
    if (candidate < start) low = mid + 1
    else high = mid - 1
  }

  return -1
}

function itemKey<V>(item: Item<V>): string {
  return item.key ?? String(item.value)
}

/** Fully-resolved key map — every group explicitly enabled or disabled. */
type ResolvedKeyMap = Required<KeyMap>

/** Everything the intent resolver needs to read, without touching React state. */
export type InputIntentContext<V> = {
  km: ResolvedKeyMap
  searchable: boolean
  searchQuery: string
  /** Cursor position within `searchQuery`, in `[0, searchQuery.length]`. */
  searchCursor: number
  hasItems: boolean
  multiple: boolean
  orientation: 'vertical' | 'horizontal'
  selectedIndex: number
  filteredItems: Array<Item<V>>
  /** Enable type-ahead jump resolution in non-searchable mode. Defaults to false. */
  typeahead?: boolean
  /** Whether the type-ahead buffer is currently active (non-empty, not yet idle-expired). Defaults to false. */
  typeaheadActive?: boolean
}

/**
 * The single normalized intent a keypress maps to. Every modifier/mode guard
 * (keyMap flags, searchable, multiple, active-vim-key, Ctrl/Alt chords) is
 * evaluated exactly once, inside {@link resolveInputIntent}, to produce one
 * of these — the `useInput` handler then dispatches on `type` alone with no
 * further guarding.
 */
export type Intent<V> =
  | { type: 'none' }
  | { type: 'search-backspace' }
  | { type: 'search-clear' }
  | { type: 'search-cursor-left' }
  | { type: 'search-cursor-right' }
  | { type: 'search-cursor-home' }
  | { type: 'search-cursor-end' }
  | { type: 'search-delete-word' }
  | { type: 'search-kill-to-start' }
  | { type: 'jump'; index: number }
  | { type: 'cancel' }
  | { type: 'toggle' }
  | { type: 'select-all' }
  | { type: 'select-none' }
  | { type: 'invert' }
  | { type: 'navigate'; index: number }
  | { type: 'submit' }
  | { type: 'search-append'; char: string }
  | { type: 'typeahead'; char: string }
  | { type: 'hotkey'; item: Item<V>; index: number }

/**
 * Search-line word/line delete, backspace, and Escape-while-querying,
 * scoped to searchable mode.
 */
function resolveSearchDeleteIntent<V>(
  key: Key,
  input: string,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { searchQuery } = context

  if (key.backspace || key.delete) {
    return { type: 'search-backspace' }
  }

  if (key.escape && searchQuery) {
    return { type: 'search-clear' }
  }

  if (key.ctrl && input === 'w') {
    return { type: 'search-delete-word' }
  }

  if (key.ctrl && input === 'u') {
    return { type: 'search-kill-to-start' }
  }

  return undefined
}

/**
 * Search-line cursor movement, scoped to searchable mode.
 *
 * Left/right and Home/End are only claimed in vertical orientation — in
 * horizontal orientation ←/→ (and Home/End, via {@link resolveJumpIntent})
 * remain list navigation, since they're currently no-ops for the cursor in
 * that layout. Ctrl+A/Ctrl+E provide cursor-to-start/end in both orientations.
 *
 * Ctrl+A is deferred to {@link resolveBulkIntent}'s select-all when the list
 * is also in multi-select mode with bulk chords enabled — Ctrl+A means
 * "select all" there, and Home still reaches cursor-to-start in vertical
 * orientation.
 */
function resolveSearchCursorIntent<V>(
  key: Key,
  input: string,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { orientation, multiple, km } = context

  if (key.ctrl && input === 'a' && !(multiple && km.bulk)) {
    return { type: 'search-cursor-home' }
  }

  if (key.ctrl && input === 'e') {
    return { type: 'search-cursor-end' }
  }

  if (orientation !== 'vertical') return undefined

  if (key.home) {
    return { type: 'search-cursor-home' }
  }

  if (key.end) {
    return { type: 'search-cursor-end' }
  }

  if (key.leftArrow) {
    return { type: 'search-cursor-left' }
  }

  if (key.rightArrow) {
    return { type: 'search-cursor-right' }
  }

  return undefined
}

/**
 * Search-line editing: cursor movement, word/line delete, backspace, and
 * Escape-while-querying — all scoped to searchable mode. Runs first in
 * {@link resolveInputIntent} so these keys always win over list navigation
 * and hotkeys while a search is active.
 */
function resolveSearchEditIntent<V>(
  key: Key,
  input: string,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  if (!context.searchable) return undefined

  return (
    resolveSearchDeleteIntent(key, input, context) ??
    resolveSearchCursorIntent(key, input, context)
  )
}

/** Home/End jump-to-boundary, gated on `km.homeEnd`. */
function resolveJumpIntent<V>(
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { km, filteredItems } = context
  if (km.homeEnd && key.home) {
    const index = findFirstValidIndex(filteredItems)
    return index === -1 ? { type: 'none' } : { type: 'jump', index }
  }

  if (km.homeEnd && key.end) {
    const index = findLastValidIndex(filteredItems)
    return index === -1 ? { type: 'none' } : { type: 'jump', index }
  }

  return undefined
}

/** -1 (backward) / +1 (forward) for the arrow or vim key pressed, orientation-aware. */
function resolveNavigateStep<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>,
  isModifiedChord: boolean
): -1 | 1 | undefined {
  const { km, orientation, searchable } = context
  const [backwardArrow, forwardArrow, backwardVimKey, forwardVimKey] =
    orientation === 'vertical'
      ? [key.upArrow, key.downArrow, 'k', 'j']
      : [key.leftArrow, key.rightArrow, 'h', 'l']

  if (
    (km.arrows && backwardArrow) ||
    (km.vimKeys && !searchable && !isModifiedChord && input === backwardVimKey)
  ) {
    return -1
  }

  if (
    (km.arrows && forwardArrow) ||
    (km.vimKeys && !searchable && !isModifiedChord && input === forwardVimKey)
  ) {
    return 1
  }

  return undefined
}

/** Arrow/vim-key navigation. Terminal: a nav key never also matches submit/search/hotkey. */
function resolveNavigateIntent<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>,
  isModifiedChord: boolean
): Intent<V> | undefined {
  const step = resolveNavigateStep(input, key, context, isModifiedChord)
  if (step === undefined) return undefined
  return {
    type: 'navigate',
    index: findNextValidIndex(
      context.filteredItems,
      context.selectedIndex,
      step
    ),
  }
}

/**
 * Type-ahead jump-to-match, gated on the `typeahead` context flag. Not active
 * in searchable mode, for Ctrl/Alt chords, or for an active vim nav key. A
 * fresh/idle buffer yields to a matching item hotkey (see
 * {@link resolveHotkeyIntent}) — once a buffer is active, subsequent
 * characters append to it instead.
 */
function resolveTypeaheadIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isModifiedChord: boolean,
  isActiveVimKey: boolean
): Intent<V> | undefined {
  const { km, searchable, multiple, filteredItems } = context

  if (
    !(context.typeahead ?? false) ||
    searchable ||
    !input ||
    isModifiedChord ||
    isActiveVimKey
  ) {
    return undefined
  }

  const isHotkeyChar =
    km.hotkeys &&
    !multiple &&
    filteredItems.some((item) => item.hotkey === input && !item.disabled)

  if (!(context.typeaheadActive ?? false) && isHotkeyChar) {
    return undefined
  }

  return { type: 'typeahead', char: input }
}

/**
 * Item hotkeys. Not active in multi-select or searchable mode, and active
 * vim nav keys or Ctrl/Alt chords (which take priority over a same-character
 * hotkey) are excluded here too. `input` is empty for arrows and other
 * non-alphanumeric keys, which would otherwise match an unset `hotkey: ''`
 * on an item (B14) — guarded explicitly here rather than relying solely on
 * navigation/jump resolving first, since a key with no navigate/jump
 * mapping (e.g. `km.arrows` disabled) can still reach this branch with an
 * empty `input`.
 */
function resolveHotkeyIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isModifiedChord: boolean,
  isActiveVimKey: boolean
): Intent<V> | undefined {
  const { km, multiple, searchable, filteredItems } = context

  if (
    !km.hotkeys ||
    multiple ||
    searchable ||
    !input ||
    isActiveVimKey ||
    isModifiedChord
  ) {
    return undefined
  }

  const hotkeyItem = filteredItems.find(
    (item) => item.hotkey === input && !item.disabled
  )
  if (!hotkeyItem) return undefined

  return {
    type: 'hotkey',
    item: hotkeyItem,
    index: filteredItems.indexOf(hotkeyItem),
  }
}

/** Resolves the full key map, defaulting any unsupplied flag to enabled (true). */
function resolveKeyMap(keyMap: KeyMap | undefined): Required<KeyMap> {
  return {
    arrows: keyMap?.arrows ?? true,
    vimKeys: keyMap?.vimKeys ?? true,
    homeEnd: keyMap?.homeEnd ?? true,
    cancel: keyMap?.cancel ?? true,
    select: keyMap?.select ?? true,
    toggle: keyMap?.toggle ?? true,
    bulk: keyMap?.bulk ?? true,
    hotkeys: keyMap?.hotkeys ?? true,
    search: keyMap?.search ?? true,
  }
}

/**
 * Ctrl/Alt-chord and active-vim-key modifier state, computed once per
 * keypress. Ctrl/Alt chords (e.g. Ctrl+K, Alt+X) surface as a bare letter in
 * `input` with `key.ctrl`/`key.meta` set — they must never be treated as vim
 * navigation, type-ahead, or item hotkeys, since those are terminal chords
 * with their own conventional meanings (Ctrl+C, Ctrl+W, etc.). A vim key is
 * only "active" when vimKeys are enabled and we're not in searchable mode
 * (where every character is search input).
 */
function resolveModifierState<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>
): { isModifiedChord: boolean; isActiveVimKey: boolean } {
  const { km, searchable, orientation } = context
  const isModifiedChord = key.ctrl || key.meta
  const navigationKeys =
    orientation === 'vertical' ? VERTICAL_NAV_KEYS : HORIZONTAL_NAV_KEYS
  const isActiveVimKey =
    km.vimKeys && !searchable && !isModifiedChord && navigationKeys.has(input)
  return { isModifiedChord, isActiveVimKey }
}

/** Space: toggle in multi-select mode (but not in searchable mode, where space is a valid search character). */
function isToggleIntent<V>(
  input: string,
  context: InputIntentContext<V>
): boolean {
  const { km, multiple, searchable } = context
  return km.toggle && multiple && !searchable && input === ' '
}

/**
 * Bulk selection chords in multi-select mode: `Ctrl+A` select-all, `Ctrl+D`
 * select-none, `Ctrl+R` invert. Gated on `km.bulk` and `multiple`, and only
 * recognized as Ctrl chords so they never collide with search-append text,
 * vim navigation, or item hotkeys (`Ctrl+I` is deliberately not used — it is
 * indistinguishable from Tab).
 */
function resolveBulkIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isCtrlChord: boolean
): Intent<V> | undefined {
  const { km, multiple } = context
  if (!km.bulk || !multiple || !isCtrlChord) return undefined

  if (input === 'a') return { type: 'select-all' }
  if (input === 'd') return { type: 'select-none' }
  if (input === 'r') return { type: 'invert' }

  return undefined
}

/**
 * Printable characters captured as search input in searchable mode. Must be
 * resolved after navigation-key handling.
 */
function resolveSearchAppendIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isModifiedChord: boolean
): Intent<V> | undefined {
  return context.searchable && context.km.search && input && !isModifiedChord
    ? { type: 'search-append', char: input }
    : undefined
}

/**
 * Normalizes a raw `(input, key)` keypress plus the current selection state
 * into a single {@link Intent}. Pure — reads only `context`, never touches
 * React state — so branch order (which is load-bearing) can be reasoned
 * about and tested in isolation from the stateful `useInput` dispatch.
 *
 * Branch order mirrors the historical `useInput` handler exactly: first
 * match wins.
 */
export function resolveInputIntent<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>
): Intent<V> {
  const { km, searchable, hasItems } = context

  const searchEdit = resolveSearchEditIntent(key, input, context)
  if (searchEdit) return searchEdit

  // Escape → onCancel is a global key: it must work even when the list has
  // no items (e.g. an empty/loading state), so it's resolved before the
  // hasItems guard below.
  if (km.cancel && key.escape) {
    return { type: 'cancel' }
  }

  if (!hasItems && !searchable) {
    return { type: 'none' }
  }

  const { isModifiedChord, isActiveVimKey } = resolveModifierState(
    input,
    key,
    context
  )

  const jump = resolveJumpIntent(key, context)
  if (jump) return jump

  if (isToggleIntent(input, context)) {
    return { type: 'toggle' }
  }

  const bulk = resolveBulkIntent(input, context, key.ctrl)
  if (bulk) return bulk

  const navigate = resolveNavigateIntent(input, key, context, isModifiedChord)
  if (navigate) return navigate

  if (km.select && key.return) {
    return { type: 'submit' }
  }

  const searchAppend = resolveSearchAppendIntent(
    input,
    context,
    isModifiedChord
  )
  if (searchAppend) return searchAppend

  const typeahead = resolveTypeaheadIntent(
    input,
    context,
    isModifiedChord,
    isActiveVimKey
  )
  if (typeahead) return typeahead

  const hotkey = resolveHotkeyIntent(
    input,
    context,
    isModifiedChord,
    isActiveVimKey
  )
  if (hotkey) return hotkey

  return { type: 'none' }
}

/** Result of applying a search-editing intent: the next query/cursor pair. */
type SearchEditResult = {
  query: string
  cursor: number
  /** Whether the edit should reset the highlighted list selection to 0. */
  resetSelection: boolean
}

/**
 * Pure string/cursor math for every search-line editing intent (append,
 * backspace, clear, cursor movement, word/line delete). Extracted out of the
 * `useInput` switch so the word-boundary scanning loop in
 * `search-delete-word` doesn't inflate that handler's cyclomatic complexity.
 * `cursorInput` is clamped to `query.length` up front so every branch below
 * can assume a valid cursor position.
 */
function computeSearchEdit<V>(
  intent: Intent<V>,
  query: string,
  cursorInput: number
): SearchEditResult {
  const cursor = Math.min(cursorInput, query.length)

  switch (intent.type) {
    case 'search-append': {
      // The appended text can be a multi-character chunk — Ink coalesces
      // consecutive plain characters delivered in the same stdin event (e.g.
      // fast typing or a paste) into a single keypress with a multi-char
      // `input` string, so the cursor must advance by its length, not by a
      // fixed 1.
      const nextQuery =
        query.slice(0, cursor) + intent.char + query.slice(cursor)
      return {
        query: nextQuery,
        cursor: cursor + intent.char.length,
        resetSelection: true,
      }
    }

    case 'search-backspace': {
      if (cursor === 0) return { query, cursor, resetSelection: true }
      const nextQuery = query.slice(0, cursor - 1) + query.slice(cursor)
      return { query: nextQuery, cursor: cursor - 1, resetSelection: true }
    }

    case 'search-clear': {
      return { query: '', cursor: 0, resetSelection: true }
    }

    case 'search-cursor-left': {
      return { query, cursor: Math.max(0, cursor - 1), resetSelection: false }
    }

    case 'search-cursor-right': {
      return {
        query,
        cursor: Math.min(query.length, cursor + 1),
        resetSelection: false,
      }
    }

    case 'search-cursor-home': {
      return { query, cursor: 0, resetSelection: false }
    }

    case 'search-cursor-end': {
      return { query, cursor: query.length, resetSelection: false }
    }

    case 'search-delete-word': {
      let start = cursor
      while (start > 0 && query[start - 1] === ' ') start--
      while (start > 0 && query[start - 1] !== ' ') start--
      const nextQuery = query.slice(0, start) + query.slice(cursor)
      return { query: nextQuery, cursor: start, resetSelection: true }
    }

    case 'search-kill-to-start': {
      return { query: query.slice(cursor), cursor: 0, resetSelection: true }
    }

    default: {
      return { query, cursor, resetSelection: false }
    }
  }
}

const SEARCH_EDIT_INTENT_TYPES = new Set<Intent<unknown>['type']>([
  'search-append',
  'search-backspace',
  'search-clear',
  'search-cursor-left',
  'search-cursor-right',
  'search-cursor-home',
  'search-cursor-end',
  'search-delete-word',
  'search-kill-to-start',
])

/**
 * Narrows `intent` to one of the nine search-editing variants. Collapses
 * what would otherwise be nine `case` labels in the `useInput` switch into a
 * single branch, keeping that switch's cyclomatic complexity in check.
 */
function isSearchEditIntent<V>(
  intent: Intent<V>
): intent is Extract<Intent<V>, { type: `search-${string}` }> {
  return SEARCH_EDIT_INTENT_TYPES.has(intent.type)
}

export type UseEnhancedSelectInputResult<V> = {
  /** Index of the currently highlighted item within the filtered items array. */
  selectedIndex: number
  /** Start of the current pagination window (0 when limit is not set). */
  rotateIndex: number
  /** The slice of items visible in the current window. */
  visibleItems: Array<Item<V>>
  /** True when filtered items is non-empty. */
  hasItems: boolean
  /** Number of items hidden above the current window. */
  itemsAbove: number
  /** Number of items hidden below the current window. */
  itemsBelow: number
  /** Keys of checked items. Only populated in multi-select mode. */
  checkedKeys: Set<string>
  /** Current search query. Empty string when searchable is false or no input yet. */
  searchQuery: string
  /**
   * Cursor position within `searchQuery`, clamped to `[0, searchQuery.length]`.
   * 0 when searchable is false or no input has been entered yet.
   */
  searchCursor: number
  /** The currently highlighted item, or undefined when there are no items. */
  selectedItem: Item<V> | undefined
  /** The filtered (pre-pagination) items array. */
  filteredItems: Array<Item<V>>
  /**
   * Index of the highlighted item within `visibleItems` (window-relative).
   * Always `selectedIndex - rotateIndex`. `-1` when there are no items.
   */
  windowIndex: number
  /**
   * Imperatively move the highlighted item to `index` (clamped into range,
   * resolved to the nearest enabled item). Keeps the pagination window in sync.
   */
  setSelectedIndex: (index: number) => void
  /**
   * Imperatively set the search query, resetting the highlighted selection
   * back to the top. No-op filtering effect unless `searchable` is true.
   */
  setSearchQuery: (query: string) => void
  /**
   * Toggle the checked state of `item` (defaults to the currently highlighted
   * item). No-op outside `multiple` mode, when the item is missing, or when
   * it is disabled. Also a no-op when checking would exceed `maxSelections`
   * (unchecking is always allowed). Fires `onToggle`.
   */
  toggle: (item?: Item<V>) => void
  /** Number of currently checked items. Always 0 outside `multiple` mode. */
  selectionCount: number
  /**
   * True when `selectionCount` satisfies `minSelections`/`maxSelections`.
   * Always true outside `multiple` mode (or when neither bound is set).
   * `onConfirm` only fires when this is true.
   */
  isSelectionValid: boolean
  /**
   * Check every enabled item (respecting the active search filter, disabled
   * items, and `maxSelections`). No-op outside `multiple` mode.
   */
  selectAll: () => void
  /** Uncheck every item. No-op outside `multiple` mode. */
  selectNone: () => void
  /**
   * Flip the checked state of every enabled item (respecting the active
   * search filter, disabled items, and `maxSelections`). No-op outside
   * `multiple` mode.
   */
  invertSelection: () => void
}

/**
 * Headless hook containing all selection state and keyboard handling for
 * EnhancedSelectInput. Use this when you need a fully custom renderer but
 * still want the built-in navigation, pagination, hotkeys, and callbacks.
 */
export function useEnhancedSelectInput<V>({
  items,
  isFocused = true,
  initialIndex = 0,
  limit,
  onSelect,
  onHighlight,
  onCancel,
  orientation = 'vertical',
  multiple = false,
  defaultSelectedKeys,
  onConfirm,
  confirmScope = 'all',
  onToggle,
  minSelections,
  maxSelections,
  searchable = false,
  keyMap,
  typeahead = false,
  typeaheadTimeout = 500,
}: UseEnhancedSelectInputProperties<V>): UseEnhancedSelectInputResult<V> {
  const km = resolveKeyMap(keyMap)
  // eslint-disable-next-line react/hook-use-state -- public API name (setSearchQuery) is reserved for the wrapper below
  const [searchQuery, setSearchQueryState] = useState('')
  const [searchCursor, setSearchCursor] = useState(0)

  // Mirror searchQuery/searchCursor synchronously so the useInput handler can
  // read-and-update both together within a single keypress, and so a burst of
  // keypresses delivered in one synchronous tick (e.g. a fast paste) chains
  // correctly — React coalesces same-tick setState calls, so a later call in
  // the same burst would otherwise still see this render's (stale) query and
  // cursor rather than the previous call's result. Resynced at the top of
  // every render so external updates (e.g. setSearchQueryPublic) stay authoritative.
  const searchQueryReference = useRef(searchQuery)
  searchQueryReference.current = searchQuery
  const searchCursorReference = useRef(searchCursor)
  searchCursorReference.current = searchCursor

  // Keep the latest onHighlight in a ref so the highlight effect below can
  // depend only on the highlighted index, not on the callback reference —
  // an inline arrow function (as shown in the README) is a new reference
  // every render and would otherwise re-fire the effect every render.
  const onHighlightReference = useRef(onHighlight)
  onHighlightReference.current = onHighlight

  // Filter items based on search query. Memoized so the reference is stable
  // across renders that don't actually change the item set — downstream
  // effects depend on this reference to distinguish "items changed" from
  // "parent re-rendered with a new-but-equivalent array".
  const filteredItems = useMemo(
    () =>
      searchable && searchQuery
        ? items.filter((item) =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : items,
    [items, searchable, searchQuery]
  )

  // Pagination windows ("pages") are computed against rendered row count —
  // items plus the group headers injected before them — not raw item count,
  // so `limit` bounds what actually appears on screen.
  const pageStarts = useMemo(
    () => (limit ? computePageStarts(filteredItems, limit) : []),
    [filteredItems, limit]
  )

  const safeInitialIndex = resolveInitialIndex(filteredItems, initialIndex)
  // eslint-disable-next-line react/hook-use-state -- public API name (setSelectedIndex) is reserved for the wrapper below
  const [selectedIndex, setSelectedIndexState] = useState(safeInitialIndex)
  // Latest-value ref so the revalidation effect can read the current
  // selectedIndex without listing it as a dependency (which would make the
  // effect re-run on every navigation keypress instead of only when the
  // filtered item set changes).
  const selectedIndexReference = useRef(selectedIndex)
  selectedIndexReference.current = selectedIndex
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => {
    const disabledKeys = new Set(
      items.filter((item) => item.disabled).map((item) => itemKey(item))
    )
    return new Set(
      (defaultSelectedKeys ?? []).filter((key) => !disabledKeys.has(key))
    )
  })
  // Mirrors `checkedKeys` synchronously so the Enter branch below can read
  // the committed set even when a Space toggle and Enter are written in the
  // same tick (no intervening render to flush the `checkedKeys` state).
  const checkedKeysReference = useRef(checkedKeys)
  const typeaheadBuffer = useRef<{ text: string; time: number }>({
    text: '',
    time: 0,
  })

  const hasItems = filteredItems.length > 0
  // Derive the pagination window offset directly from selectedIndex so there
  // is a single source of truth. pageStartFor finds the largest page-start
  // that is <= selectedIndex, keeping the selection inside the visible window
  // even when limit or pageStarts change at runtime (e.g. terminal resize).
  // Both lookups are binary searches — pageStarts is strictly ascending — so
  // per-render cost is O(log pages) rather than O(pages).
  const effectiveRotateIndex = limit
    ? pageStartFor(pageStarts, selectedIndex)
    : 0
  const currentPageIndex = pageIndexOfStart(pageStarts, effectiveRotateIndex)
  const nextPageStart =
    currentPageIndex !== -1 && currentPageIndex + 1 < pageStarts.length
      ? pageStarts[currentPageIndex + 1]
      : filteredItems.length
  const visibleItems = limit
    ? filteredItems.slice(effectiveRotateIndex, nextPageStart)
    : filteredItems
  const itemsAbove = effectiveRotateIndex
  const itemsBelow = limit
    ? Math.max(
        0,
        filteredItems.length - effectiveRotateIndex - visibleItems.length
      )
    : 0
  const selectedItem = hasItems ? filteredItems[selectedIndex] : undefined
  const windowIndex = hasItems ? selectedIndex - effectiveRotateIndex : -1

  // Warn in development when duplicate React keys are detected — this
  // happens when V is an object and item.key is not set, causing
  // String(value) to produce "[object Object]" for every item. `items` is
  // frequently an inline array literal from the caller, so it's a new
  // reference every render even when its content is identical — comparing
  // the computed duplicate set by value (via lastWarnedDuplicatesReference)
  // and only warning when it actually changes keeps this from spamming the
  // console on every re-render.
  const lastWarnedDuplicatesReference = useRef<string | undefined>(undefined)
  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production' || items.length === 0) return

    const keys = items.map((item) => itemKey(item))
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const k of keys) {
      if (seen.has(k)) duplicates.add(k)
      else seen.add(k)
    }

    const signature =
      duplicates.size > 0 ? [...duplicates].sort().join(',') : undefined

    if (
      signature !== undefined &&
      signature !== lastWarnedDuplicatesReference.current
    ) {
      lastWarnedDuplicatesReference.current = signature
      console.warn(
        `[ink-enhanced-select-input] Duplicate item keys detected: ${[
          ...duplicates,
        ].join(', ')}. ` +
          'Set a unique "key" on each item — this is required when value is a non-primitive type (e.g. object).'
      )
    } else if (signature === undefined) {
      lastWarnedDuplicatesReference.current = undefined
    }
  }, [items])

  // When the filtered item set changes, re-validate the current
  // selectedIndex. If the item at that position is still enabled we keep
  // it; otherwise we resolve the nearest valid index from the same
  // position, so the selection stays as close as possible to where the
  // user left off. `filteredItems` is memoized above, so this only re-runs
  // when items/searchQuery actually change content — not on every render.
  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedIndexState(0)
      return
    }

    const currentItem = filteredItems[selectedIndexReference.current]
    if (!currentItem || currentItem.disabled) {
      const newIndex = resolveInitialIndex(
        filteredItems,
        selectedIndexReference.current
      )
      setSelectedIndexState(newIndex)
    }
  }, [filteredItems, limit, pageStarts])

  // Fire onHighlight when the highlighted item's identity (key) changes,
  // not merely when the items array reference changes — that would cause
  // spurious calls on every parent re-render that passes a new array with
  // identical content. Keying on `highlightedKey` (rather than
  // `selectedIndex`) also fixes the stale-closure bug where the item at a
  // given index changes content while the index itself stays put: the
  // effect now re-fires with the new item instead of silently keeping the
  // old one.
  const highlightedItem = hasItems ? filteredItems[selectedIndex] : undefined
  const highlightedItemReference = useRef(highlightedItem)
  highlightedItemReference.current = highlightedItem
  const highlightedKey = highlightedItem ? itemKey(highlightedItem) : undefined

  // Warn in development when per-item `indicator` is combined with
  // `multiple` — the checkbox indicator always wins in multi-select mode,
  // so a supplied `item.indicator` is silently unused otherwise. Depend on
  // this derived boolean (not `items`) so the warning doesn't re-fire on
  // every parent re-render that passes a new-but-equivalent items array.
  const hasIgnoredIndicator =
    multiple && items.some((item) => Boolean(item.indicator))

  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (!hasIgnoredIndicator) return
    console.warn(
      '[ink-enhanced-select-input] item.indicator is ignored when multiple is true — ' +
        'the built-in checkbox indicator takes precedence. Use indicatorComponent to ' +
        'customize indicators in multi-select mode.'
    )
  }, [hasIgnoredIndicator])

  // Re-fire whenever the highlighted item's *identity* changes, not just its
  // index — filtering can swap in a different item at the same index (e.g.
  // typing resets selectedIndex to 0, which was already 0), and that must
  // still notify. Not when the items array reference changes (which would
  // cause spurious calls on every parent re-render that passes a new array
  // with identical content) or when onHighlight's reference changes (an
  // inline callback is a new reference every render) — both the item and
  // the callback are read from refs so the effect can depend on nothing but
  // `highlightedKey`, with no suppression needed.
  useEffect(() => {
    const item = highlightedItemReference.current
    if (item && !item.disabled) {
      onHighlightReference.current?.(item)
    }
  }, [highlightedKey])

  const updateSelection = (nextIndex: number) => {
    setSelectedIndexState(nextIndex)
  }

  // Toggle the checked state of `item` (defaults to the highlighted item) in
  // multi-select mode. Shared by the Space keybinding and the public API so
  // custom keybindings can reuse the exact same behaviour.
  const toggle = (item: Item<V> | undefined = filteredItems[selectedIndex]) => {
    if (!multiple || !item || item.disabled) return
    const k = itemKey(item)
    // Compute the next set from the ref (not React's functional-updater
    // `previous` argument) and assign it back synchronously, right here —
    // React may defer actually invoking a functional setState updater, so a
    // same-tick Enter that reads checkedKeysReference.current must not
    // depend on that updater having run yet.
    const { current } = checkedKeysReference
    const willCheck = !current.has(k)
    // Unchecking is always allowed; checking a new item is refused once
    // maxSelections is already met.
    if (
      willCheck &&
      maxSelections !== undefined &&
      current.size >= maxSelections
    ) {
      return
    }

    const next = new Set(current)
    if (willCheck) next.add(k)
    else next.delete(k)
    checkedKeysReference.current = next
    onToggle?.(item, willCheck)
    setCheckedKeys(next)
  }

  // Bulk selection helpers — select-all/invert only add enabled items drawn
  // from filteredItems (never disabled ones, matching defaultSelectedKeys'
  // and toggle's behaviour) and stop adding once maxSelections is reached,
  // in filteredItems order, so the result is deterministic. None of these
  // fire onToggle per-item to avoid callback storms on large lists.
  const selectAll = () => {
    if (!multiple) return
    const next = new Set(checkedKeysReference.current)
    for (const item of filteredItems) {
      if (item.disabled) continue
      if (maxSelections !== undefined && next.size >= maxSelections) break
      next.add(itemKey(item))
    }

    checkedKeysReference.current = next
    setCheckedKeys(next)
  }

  const selectNone = () => {
    if (!multiple) return
    const next = new Set<string>()
    checkedKeysReference.current = next
    setCheckedKeys(next)
  }

  const invertSelection = () => {
    if (!multiple) return
    const { current } = checkedKeysReference
    const next = new Set(current)
    for (const item of filteredItems) {
      if (item.disabled) continue
      const k = itemKey(item)
      if (next.has(k)) {
        next.delete(k)
      } else if (maxSelections === undefined || next.size < maxSelections) {
        next.add(k)
      }
    }

    checkedKeysReference.current = next
    setCheckedKeys(next)
  }

  const selectionCount = multiple ? checkedKeys.size : 0
  const isSelectionValid =
    !multiple ||
    ((minSelections === undefined || selectionCount >= minSelections) &&
      (maxSelections === undefined || selectionCount <= maxSelections))

  const setSelectedIndexPublic = (index: number) => {
    updateSelection(resolveInitialIndex(filteredItems, index))
  }

  const setSearchQueryPublic = (query: string) => {
    searchQueryReference.current = query
    searchCursorReference.current = query.length
    setSearchQueryState(query)
    setSearchCursor(query.length)
    setSelectedIndexState(0)
  }

  // Enter: in multi-select mode confirms the full selection, gated on
  // minSelections/maxSelections; otherwise selects the highlighted item.
  const handleSubmit = () => {
    if (multiple) {
      // Read the count from the ref (not the `checkedKeys` state) since a
      // Space toggle queued in the same tick has not been committed to
      // state yet when this handler runs.
      const checkedCount = checkedKeysReference.current.size
      const valid =
        (minSelections === undefined || checkedCount >= minSelections) &&
        (maxSelections === undefined || checkedCount <= maxSelections)
      if (!valid) return

      // Default to `items` (not `filteredItems`) so checks made
      // before/between search filters aren't silently dropped from the
      // confirmed set.
      const confirmSource = confirmScope === 'filtered' ? filteredItems : items
      const confirmed = confirmSource.filter((item) =>
        checkedKeysReference.current.has(itemKey(item))
      )
      onConfirm?.(confirmed)
      return
    }

    const itemToSelect = filteredItems[selectedIndex]
    if (itemToSelect && !itemToSelect.disabled) {
      onSelect?.(itemToSelect)
    }
  }

  // Accumulate printable characters into a short-lived buffer and jump the
  // highlight to the first item whose label starts with it. Idle buffers
  // reset after `typeaheadTimeout` ms.
  const handleTypeahead = (char: string, isActive: boolean, now: number) => {
    const next = isActive ? typeaheadBuffer.current.text + char : char
    typeaheadBuffer.current = { text: next, time: now }
    const matchIndex = filteredItems.findIndex(
      (item) =>
        !item.disabled &&
        item.label.toLowerCase().startsWith(next.toLowerCase())
    )
    if (matchIndex !== -1) updateSelection(matchIndex)
  }

  useInput(
    (input, key) => {
      const now = Date.now()
      const typeaheadIsActive =
        typeaheadBuffer.current.text !== '' &&
        now - typeaheadBuffer.current.time < typeaheadTimeout

      const intent = resolveInputIntent(input, key, {
        km,
        searchable,
        searchQuery: searchQueryReference.current,
        searchCursor: searchCursorReference.current,
        hasItems,
        multiple,
        orientation,
        selectedIndex,
        filteredItems,
        typeahead,
        typeaheadActive: typeaheadIsActive,
      })

      if (isSearchEditIntent(intent)) {
        const edit = computeSearchEdit(
          intent,
          searchQueryReference.current,
          searchCursorReference.current
        )
        searchQueryReference.current = edit.query
        searchCursorReference.current = edit.cursor
        setSearchQueryState(edit.query)
        setSearchCursor(edit.cursor)
        if (edit.resetSelection) setSelectedIndexState(0)
        return
      }

      switch (intent.type) {
        case 'cancel': {
          onCancel?.()
          break
        }

        case 'jump': {
          updateSelection(intent.index)
          break
        }

        case 'toggle': {
          toggle()
          break
        }

        case 'select-all': {
          selectAll()
          break
        }

        case 'select-none': {
          selectNone()
          break
        }

        case 'invert': {
          invertSelection()
          break
        }

        case 'navigate': {
          if (intent.index !== selectedIndex) {
            updateSelection(intent.index)
          }

          break
        }

        case 'submit': {
          handleSubmit()
          break
        }

        case 'typeahead': {
          handleTypeahead(intent.char, typeaheadIsActive, now)
          break
        }

        case 'hotkey': {
          updateSelection(intent.index)
          onSelect?.(intent.item)
          break
        }

        case 'none': {
          break
        }
      }
    },
    { isActive: isFocused }
  )

  return {
    selectedIndex,
    rotateIndex: effectiveRotateIndex,
    visibleItems,
    hasItems,
    itemsAbove,
    itemsBelow,
    checkedKeys,
    searchQuery,
    searchCursor: Math.min(searchCursor, searchQuery.length),
    selectedItem,
    filteredItems,
    windowIndex,
    setSelectedIndex: setSelectedIndexPublic,
    setSearchQuery: setSearchQueryPublic,
    toggle,
    selectionCount,
    isSelectionValid,
    selectAll,
    selectNone,
    invertSelection,
  }
}

/** Default colors, reproducing the component's original (pre-theming) appearance. */
const DEFAULT_THEME: ThemeColors = {
  selected: 'green',
  disabled: 'gray',
  groupHeader: undefined,
  hotkey: 'gray',
  scrollIndicator: undefined,
  searchPlaceholder: undefined,
}

/**
 * Whether color output should be suppressed, per the NO_COLOR spec
 * (https://no-color.org/): presence of the variable disables color,
 * *unless* its value is the empty string. Read live (not cached) so tests
 * can toggle it between renders.
 */
function isNoColor(): boolean {
  // eslint-disable-next-line n/prefer-global/process
  return Boolean(process.env['NO_COLOR'])
}

/**
 * Merges a partial theme over {@link DEFAULT_THEME}, then — when `NO_COLOR`
 * is set — collapses every color to `undefined` and disables dim styling
 * (dim is an ANSI SGR effect, which NO_COLOR is understood to suppress too).
 */
function resolveTheme(theme?: Partial<Theme>): ResolvedTheme {
  const merged = { ...DEFAULT_THEME, ...theme }
  if (isNoColor()) {
    return {
      selected: undefined,
      disabled: undefined,
      groupHeader: undefined,
      hotkey: undefined,
      scrollIndicator: undefined,
      searchPlaceholder: undefined,
      dim: false,
    }
  }

  return { ...merged, dim: true }
}

export function DefaultIndicatorComponent({
  isSelected,
  isChecked,
  checkedIndicator = '[x]',
  uncheckedIndicator = '[ ]',
  theme,
}: IndicatorProperties) {
  const resolvedTheme = theme ?? resolveTheme()
  if (isChecked !== undefined) {
    // Multi-select mode: show checkbox + cursor
    return (
      <Box marginRight={1}>
        <Text color={isSelected ? resolvedTheme.selected : undefined}>
          {isChecked ? checkedIndicator : uncheckedIndicator}
        </Text>
      </Box>
    )
  }

  // Single-select mode: classic arrow cursor
  return (
    <Box marginRight={1}>
      <Text color={isSelected ? resolvedTheme.selected : undefined}>
        {isSelected ? '>' : ' '}
      </Text>
    </Box>
  )
}

export function DefaultItemComponent({
  isSelected,
  label,
  isDisabled,
  theme,
}: ItemProperties) {
  const resolvedTheme = theme ?? resolveTheme()
  let color: string | undefined
  if (isDisabled) {
    color = resolvedTheme.disabled
  } else if (isSelected) {
    color = resolvedTheme.selected
  }

  return (
    <Text
      color={color}
      dimColor={isDisabled && resolvedTheme.dim}
      wrap="truncate-end"
    >
      {label}
    </Text>
  )
}

export function DefaultGroupHeaderComponent({
  label,
  theme,
}: GroupHeaderProperties) {
  const resolvedTheme = theme ?? resolveTheme()
  return (
    <Box>
      <Text
        color={resolvedTheme.groupHeader}
        dimColor={resolvedTheme.dim}
        wrap="truncate-end"
      >{`── ${label} ──`}</Text>
    </Box>
  )
}

/** The "n selected[/bound]" line shown above the list in multi-select mode, or `null` when hidden. */
function resolveSelectionCountLine(
  show: boolean,
  count: number,
  bound: number | undefined
): React.ReactNode {
  if (!show) return null
  return (
    <Box>
      <Text dimColor>
        {count} selected
        {bound === undefined ? '' : `/${bound}`}
      </Text>
    </Box>
  )
}

export function EnhancedSelectInput<V>({
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  groupHeaderComponent = DefaultGroupHeaderComponent,
  showScrollIndicators = false,
  searchPlaceholder = 'Search...',
  checkedIndicator = '[x]',
  uncheckedIndicator = '[ ]',
  showSelectionCount = false,
  theme,
  // All remaining props are forwarded to the hook
  ...hookProperties
}: Properties<V>) {
  const {
    selectedIndex,
    rotateIndex,
    visibleItems,
    hasItems,
    itemsAbove,
    itemsBelow,
    checkedKeys,
    searchQuery,
    searchCursor,
    selectionCount,
  } = useEnhancedSelectInput(hookProperties)

  const resolvedTheme = resolveTheme(theme)
  const searchable = hookProperties.searchable === true

  if (!hasItems && !searchable) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent
  const GroupHeaderComponent = groupHeaderComponent
  const isVertical = hookProperties.orientation !== 'horizontal'
  const isMultiple = hookProperties.multiple === true

  const searchInput = searchable ? (
    <Box>
      {searchQuery ? (
        <Text color={resolvedTheme.searchPlaceholder}>
          <Text dimColor={resolvedTheme.dim}>{`/ ${searchQuery.slice(
            0,
            searchCursor
          )}`}</Text>
          <Text inverse>{searchQuery[searchCursor] ?? ' '}</Text>
          <Text dimColor={resolvedTheme.dim}>
            {searchQuery.slice(searchCursor + 1)}
          </Text>
        </Text>
      ) : (
        <Text
          color={resolvedTheme.searchPlaceholder}
          dimColor={resolvedTheme.dim}
        >
          {'/ '}
          <Text inverse>{searchPlaceholder[0] ?? ' '}</Text>
          {searchPlaceholder.slice(1)}
        </Text>
      )}
    </Box>
  ) : null

  const { maxSelections, minSelections } = hookProperties
  const selectionBound = maxSelections ?? minSelections
  const selectionCountLine = resolveSelectionCountLine(
    showSelectionCount && isMultiple,
    selectionCount,
    selectionBound
  )

  if (!hasItems) {
    // Searchable mode with no matching results
    return (
      <Box flexDirection="column">
        {searchInput}
        {selectionCountLine}
        <Box>
          <Text dimColor={resolvedTheme.dim}>No matches</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {searchInput}
      {selectionCountLine}
      <Box flexDirection={isVertical ? 'column' : 'row'}>
        {showScrollIndicators && itemsAbove > 0 && (
          <Box marginRight={isVertical ? 0 : 1}>
            <Text
              color={resolvedTheme.scrollIndicator}
              dimColor={resolvedTheme.dim}
            >
              {isVertical ? `▲ ${itemsAbove} more` : `◀ ${itemsAbove} more`}
            </Text>
          </Box>
        )}
        <Box
          flexDirection={isVertical ? 'column' : 'row'}
          gap={isVertical ? 0 : 2}
        >
          {visibleItems.map((item, index) => {
            // A disabled item never gets a selection cursor, even if it's the
            // resolved selectedIndex (e.g. every item is disabled, so
            // resolveInitialIndex has nowhere valid to land). This keeps the
            // render in agreement with the onHighlight effect, which only
            // fires for enabled items.
            const isSelected =
              index + rotateIndex === selectedIndex && !item.disabled
            const isChecked = isMultiple
              ? checkedKeys.has(itemKey(item))
              : undefined

            // Determine if we need to render a group header before this item.
            // Compare against the immediately preceding visible item (adjacency check),
            // so non-contiguous items sharing a group name each get their own header.
            const previousVisibleItem =
              index > 0 ? visibleItems[index - 1] : undefined
            let groupHeader: React.ReactNode = null
            if (item.group && item.group !== previousVisibleItem?.group) {
              groupHeader = (
                <GroupHeaderComponent
                  key={`group-header-${index}-${item.group}`}
                  label={item.group}
                  theme={resolvedTheme}
                />
              )
            }

            return (
              <React.Fragment key={itemKey(item)}>
                {groupHeader}
                <Box>
                  {item.indicator && !isMultiple ? (
                    <Box marginRight={1}>
                      <Text>{isSelected ? item.indicator : ' '}</Text>
                    </Box>
                  ) : (
                    <IndicatorComponent
                      isSelected={isSelected}
                      isChecked={isChecked}
                      item={item}
                      checkedIndicator={checkedIndicator}
                      uncheckedIndicator={uncheckedIndicator}
                      theme={resolvedTheme}
                    />
                  )}
                  <ItemComponent
                    isSelected={isSelected}
                    label={item.label}
                    isDisabled={Boolean(item.disabled)}
                    isChecked={isChecked}
                    theme={resolvedTheme}
                  />
                  {item.hotkey && !isMultiple && (
                    <Text
                      dimColor={resolvedTheme.dim}
                      color={resolvedTheme.hotkey}
                    >
                      {' '}
                      ({item.hotkey})
                    </Text>
                  )}
                </Box>
              </React.Fragment>
            )
          })}
        </Box>
        {showScrollIndicators && itemsBelow > 0 && (
          <Box marginLeft={isVertical ? 0 : 1}>
            <Text
              color={resolvedTheme.scrollIndicator}
              dimColor={resolvedTheme.dim}
            >
              {isVertical ? `▼ ${itemsBelow} more` : `▶ ${itemsBelow} more`}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
