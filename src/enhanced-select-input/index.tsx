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
  /**
   * Secondary text rendered dimmed on its own line beneath the label
   * (command-palette style).
   */
  description?: string
  /** Short dimmed text rendered to the right of the label. */
  hint?: string
  /**
   * Dimmed text rendered beside the label explaining why a `disabled` item
   * can't be selected. Ignored when the item isn't disabled.
   */
  disabledReason?: string
}

/**
 * A non-navigable visual rule with no label or value. Renders as a dimmed
 * divider and is skipped by all navigation, search, hotkeys, and selection —
 * the same treatment as a `disabled` item, but it can never be highlighted.
 */
export type SeparatorItem = {
  readonly type: 'separator'
  /** Unique key for React rendering. Falls back to a position-based key. */
  readonly key?: string
}

export type ItemOrSeparator<V> = Item<V> | SeparatorItem

export function isSeparator<V>(
  item: ItemOrSeparator<V>
): item is SeparatorItem {
  return (item as SeparatorItem).type === 'separator'
}

/** True when `item` can be highlighted/selected — not a separator and not disabled. */
export function isSelectable<V>(
  item: ItemOrSeparator<V> | undefined
): item is Item<V> {
  return item !== undefined && !isSeparator(item) && !item.disabled
}

function groupOf<V>(item: ItemOrSeparator<V> | undefined): string | undefined {
  return item && !isSeparator(item) ? item.group : undefined
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
}

/** Props accepted by the useEnhancedSelectInput hook (all behaviour, no rendering). */
export type UseEnhancedSelectInputProperties<V> = {
  readonly items: Array<ItemOrSeparator<V>>
  readonly isFocused?: boolean
  readonly initialIndex?: number
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

/** Full component props — hook props plus rendering customisation. */
export type Properties<V> = UseEnhancedSelectInputProperties<V> & {
  readonly indicatorComponent?: FC<IndicatorProperties>
  readonly itemComponent?: FC<ItemProperties>
  readonly groupHeaderComponent?: FC<GroupHeaderProperties>
  /** Custom renderer for `{ type: 'separator' }` rows. */
  readonly separatorComponent?: FC<SeparatorProperties>
  /**
   * Show ▲/▼ (vertical) or ◀/▶ (horizontal) indicators with item counts
   * when the limit window doesn't cover the full list. Only meaningful when
   * `limit` is set. Defaults to false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly showScrollIndicators?: boolean
  /** Placeholder text shown in the search input when the query is empty. */
  readonly searchPlaceholder?: string
}

export type IndicatorProperties = {
  readonly isSelected: boolean
  /** True when the item is checked in multi-select mode. Undefined in single-select mode. */
  readonly isChecked?: boolean
  // eslint-disable-next-line react/no-unused-prop-types
  readonly item: Item<unknown>
}

export type ItemProperties = {
  readonly isSelected: boolean
  readonly label: string
  readonly isDisabled: boolean
  /** True when the item is checked in multi-select mode. Undefined in single-select mode. */
  // eslint-disable-next-line react/no-unused-prop-types
  readonly isChecked?: boolean
  // eslint-disable-next-line react/no-unused-prop-types
  readonly description?: string
  // eslint-disable-next-line react/no-unused-prop-types
  readonly hint?: string
  // eslint-disable-next-line react/no-unused-prop-types
  readonly disabledReason?: string
}

export type GroupHeaderProperties = {
  readonly label: string
}

export type SeparatorProperties = Record<string, unknown>

// Vim navigation keys that take precedence over hotkeys.
// An item hotkey that matches one of these values will never fire in the
// corresponding orientation — document this constraint at the call site.
const VERTICAL_NAV_KEYS = new Set(['j', 'k'])
const HORIZONTAL_NAV_KEYS = new Set(['h', 'l'])

export function resolveInitialIndex<V>(
  items: Array<ItemOrSeparator<V>>,
  initialIndex: number
): number {
  if (items.length === 0) return 0
  const clamped = Math.max(0, Math.min(initialIndex, items.length - 1))
  if (isSelectable(items[clamped])) return clamped
  // Search forward for the nearest selectable item, wrapping around
  for (let i = 1; i < items.length; i++) {
    const nextIndex = (clamped + i) % items.length
    if (isSelectable(items[nextIndex])) return nextIndex
  }

  return clamped
}

export function findNextValidIndex<V>(
  items: Array<ItemOrSeparator<V>>,
  currentIndex: number,
  step: number
): number {
  const itemCount = items.length
  if (itemCount === 0) return 0

  let nextIndex = currentIndex

  for (let i = 0; i < itemCount; i++) {
    nextIndex = (nextIndex + step + itemCount) % itemCount
    if (isSelectable(items[nextIndex])) {
      return nextIndex
    }
  }

  // No selectable item — stay put
  return currentIndex
}

export function findFirstValidIndex<V>(
  items: Array<ItemOrSeparator<V>>
): number {
  for (const [i, item] of items.entries()) {
    if (isSelectable(item)) return i
  }

  return -1
}

export function findLastValidIndex<V>(
  items: Array<ItemOrSeparator<V>>
): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (isSelectable(items[i])) return i
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
  items: Array<ItemOrSeparator<V>>,
  limit: number
): number[] {
  if (items.length === 0) return []
  if (!limit || limit <= 0) return [0]

  const starts: number[] = [0]
  let pageStart = 0
  let running = 0
  let placedInPage = 0

  for (let i = 0; i < items.length; i++) {
    const previousGroup = i === pageStart ? undefined : groupOf(items[i - 1])
    const currentGroup = groupOf(items[i])
    const headerCost = currentGroup && currentGroup !== previousGroup ? 1 : 0
    const cost = headerCost + 1

    if (placedInPage > 0 && running + cost > limit) {
      pageStart = i
      starts.push(pageStart)
      const newHeaderCost = groupOf(items[i]) ? 1 : 0
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
  hasItems: boolean
  multiple: boolean
  orientation: 'vertical' | 'horizontal'
  selectedIndex: number
  filteredItems: Array<ItemOrSeparator<V>>
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
  | { type: 'jump'; index: number }
  | { type: 'cancel' }
  | { type: 'toggle' }
  | { type: 'navigate'; index: number }
  | { type: 'submit' }
  | { type: 'search-append'; char: string }
  | { type: 'typeahead'; char: string }
  | { type: 'hotkey'; item: Item<V>; index: number }

/** Backspace/Delete and Escape-while-querying, scoped to searchable mode. */
function resolveSearchEditIntent<V>(
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { searchable, searchQuery } = context
  if (searchable && (key.backspace || key.delete)) {
    return { type: 'search-backspace' }
  }

  if (searchable && key.escape && searchQuery) {
    return { type: 'search-clear' }
  }

  return undefined
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
    km.select &&
    !multiple &&
    filteredItems.some((item) => isSelectable(item) && item.hotkey === input)

  if (!(context.typeaheadActive ?? false) && isHotkeyChar) {
    return undefined
  }

  return { type: 'typeahead', char: input }
}

/**
 * Item hotkeys. Not active in multi-select or searchable mode, and active
 * vim nav keys or Ctrl/Alt chords (which take priority over a same-character
 * hotkey) are excluded here too.
 */
function resolveHotkeyIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isModifiedChord: boolean,
  isActiveVimKey: boolean
): Intent<V> | undefined {
  const { km, multiple, searchable, filteredItems } = context

  if (
    !km.select ||
    multiple ||
    searchable ||
    isActiveVimKey ||
    isModifiedChord
  ) {
    return undefined
  }

  const hotkeyItem = filteredItems.find(
    (item): item is Item<V> => isSelectable(item) && item.hotkey === input
  )
  if (!hotkeyItem) return undefined

  return {
    type: 'hotkey',
    item: hotkeyItem,
    index: filteredItems.indexOf(hotkeyItem),
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
 * Printable characters captured as search input in searchable mode. Must be
 * resolved after navigation-key handling.
 */
function resolveSearchAppendIntent<V>(
  input: string,
  context: InputIntentContext<V>,
  isModifiedChord: boolean
): Intent<V> | undefined {
  return context.searchable && input && !isModifiedChord
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

  const searchEdit = resolveSearchEditIntent(key, context)
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

export type UseEnhancedSelectInputResult<V> = {
  /** Index of the currently highlighted item within the filtered items array. */
  selectedIndex: number
  /** Start of the current pagination window (0 when limit is not set). */
  rotateIndex: number
  /** The slice of items visible in the current window. */
  visibleItems: Array<ItemOrSeparator<V>>
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
  /** The currently highlighted item, or undefined when there are no items. */
  selectedItem: Item<V> | undefined
  /** The filtered (pre-pagination) items array. */
  filteredItems: Array<ItemOrSeparator<V>>
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
   * it is disabled. Fires `onToggle`.
   */
  toggle: (item?: Item<V>) => void
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
  searchable = false,
  keyMap,
  typeahead = false,
  typeaheadTimeout = 500,
}: UseEnhancedSelectInputProperties<V>): UseEnhancedSelectInputResult<V> {
  // Resolve full key map — any flag not supplied defaults to enabled (true).
  const km = {
    arrows: keyMap?.arrows ?? true,
    vimKeys: keyMap?.vimKeys ?? true,
    homeEnd: keyMap?.homeEnd ?? true,
    cancel: keyMap?.cancel ?? true,
    select: keyMap?.select ?? true,
    toggle: keyMap?.toggle ?? true,
  }
  // eslint-disable-next-line react/hook-use-state -- public API name (setSearchQuery) is reserved for the wrapper below
  const [searchQuery, setSearchQueryState] = useState('')

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
  const filteredItems = useMemo<Array<ItemOrSeparator<V>>>(
    () =>
      searchable && searchQuery
        ? items.filter(
            (item): item is Item<V> =>
              !isSeparator(item) &&
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
      items
        .filter(
          (item): item is Item<V> =>
            !isSeparator(item) && Boolean(item.disabled)
        )
        .map((item) => itemKey(item))
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
  const rawSelectedItem = hasItems ? filteredItems[selectedIndex] : undefined
  const selectedItem =
    rawSelectedItem && !isSeparator(rawSelectedItem)
      ? rawSelectedItem
      : undefined
  const windowIndex = hasItems ? selectedIndex - effectiveRotateIndex : -1

  // Warn in development when duplicate React keys are detected — this
  // happens when V is an object and item.key is not set, causing
  // String(value) to produce "[object Object]" for every item. Keyed only
  // to `items` so it doesn't re-run on every search keystroke.
  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] !== 'production' && items.length > 0) {
      const keys = items
        .filter((item): item is Item<V> => !isSeparator(item))
        .map((item) => itemKey(item))
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      for (const k of keys) {
        if (seen.has(k)) duplicates.add(k)
        else seen.add(k)
      }

      if (duplicates.size > 0) {
        console.warn(
          `[ink-enhanced-select-input] Duplicate item keys detected: ${[
            ...duplicates,
          ].join(', ')}. ` +
            'Set a unique "key" on each item — this is required when value is a non-primitive type (e.g. object).'
        )
      }
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
    if (!isSelectable(currentItem)) {
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
  const highlightedKey =
    highlightedItem && !isSeparator(highlightedItem)
      ? itemKey(highlightedItem)
      : undefined

  // Warn in development when per-item `indicator` is combined with
  // `multiple` — the checkbox indicator always wins in multi-select mode,
  // so a supplied `item.indicator` is silently unused otherwise. Depend on
  // this derived boolean (not `items`) so the warning doesn't re-fire on
  // every parent re-render that passes a new-but-equivalent items array.
  const hasIgnoredIndicator =
    multiple &&
    items.some((item) => !isSeparator(item) && Boolean(item.indicator))

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
    if (item && !isSeparator(item) && !item.disabled) {
      onHighlightReference.current?.(item)
    }
  }, [highlightedKey])

  const updateSelection = (nextIndex: number) => {
    setSelectedIndexState(nextIndex)
  }

  // Toggle the checked state of `item` (defaults to the highlighted item) in
  // multi-select mode. Shared by the Space keybinding and the public API so
  // custom keybindings can reuse the exact same behaviour.
  const toggle = (item?: Item<V>) => {
    const target = item ?? filteredItems[selectedIndex]
    if (!multiple || !isSelectable(target)) return
    const k = itemKey(target)
    // Compute the next set from the ref (not React's functional-updater
    // `previous` argument) and assign it back synchronously, right here —
    // React may defer actually invoking a functional setState updater, so a
    // same-tick Enter that reads checkedKeysReference.current must not
    // depend on that updater having run yet.
    const next = new Set(checkedKeysReference.current)
    const nowChecked = !next.has(k)
    if (nowChecked) next.add(k)
    else next.delete(k)
    checkedKeysReference.current = next
    onToggle?.(target, nowChecked)
    setCheckedKeys(next)
  }

  const setSelectedIndexPublic = (index: number) => {
    updateSelection(resolveInitialIndex(filteredItems, index))
  }

  const setSearchQueryPublic = (query: string) => {
    setSearchQueryState(query)
    setSelectedIndexState(0)
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
        searchQuery,
        hasItems,
        multiple,
        orientation,
        selectedIndex,
        filteredItems,
        typeahead,
        typeaheadActive: typeaheadIsActive,
      })

      switch (intent.type) {
        case 'search-backspace': {
          setSearchQueryState((previous) => previous.slice(0, -1))
          setSelectedIndexState(0)
          break
        }

        case 'search-clear': {
          setSearchQueryState('')
          setSelectedIndexState(0)
          break
        }

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

        case 'navigate': {
          if (intent.index !== selectedIndex) {
            updateSelection(intent.index)
          }

          break
        }

        case 'submit': {
          if (multiple) {
            // In multi-select mode Enter confirms the full selection. Default
            // to `items` (not `filteredItems`) so checks made before/between
            // search filters aren't silently dropped from the confirmed set.
            // Read from the ref (not the `checkedKeys` state) since a Space
            // toggle queued in the same tick has not been committed to state
            // yet when this handler runs.
            const confirmSource =
              confirmScope === 'filtered' ? filteredItems : items
            const confirmed = confirmSource.filter(
              (item): item is Item<V> =>
                !isSeparator(item) &&
                checkedKeysReference.current.has(itemKey(item))
            )
            onConfirm?.(confirmed)
          } else {
            const itemToSelect = filteredItems[selectedIndex]
            if (isSelectable(itemToSelect)) {
              onSelect?.(itemToSelect)
            }
          }

          break
        }

        case 'search-append': {
          setSearchQueryState((previous) => previous + intent.char)
          setSelectedIndexState(0)
          break
        }

        case 'typeahead': {
          // Accumulate printable characters into a short-lived buffer and
          // jump the highlight to the first item whose label starts with
          // it. Idle buffers reset after `typeaheadTimeout` ms.
          const next = typeaheadIsActive
            ? typeaheadBuffer.current.text + intent.char
            : intent.char
          typeaheadBuffer.current = { text: next, time: now }
          const matchIndex = filteredItems.findIndex(
            (item) =>
              isSelectable(item) &&
              item.label.toLowerCase().startsWith(next.toLowerCase())
          )
          if (matchIndex !== -1) updateSelection(matchIndex)
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
    selectedItem,
    filteredItems,
    windowIndex,
    setSelectedIndex: setSelectedIndexPublic,
    setSearchQuery: setSearchQueryPublic,
    toggle,
  }
}

export function DefaultIndicatorComponent({
  isSelected,
  isChecked,
}: IndicatorProperties) {
  if (isChecked !== undefined) {
    // Multi-select mode: show checkbox + cursor
    return (
      <Box marginRight={1}>
        <Text color={isSelected ? 'green' : undefined}>
          {isChecked ? '[x]' : '[ ]'}
        </Text>
      </Box>
    )
  }

  // Single-select mode: classic arrow cursor
  return (
    <Box marginRight={1}>
      <Text color={isSelected ? 'green' : undefined}>
        {isSelected ? '>' : ' '}
      </Text>
    </Box>
  )
}

export function DefaultItemComponent({
  isSelected,
  label,
  isDisabled,
}: ItemProperties) {
  return (
    <Text
      color={isDisabled ? 'gray' : isSelected ? 'green' : undefined}
      dimColor={isDisabled}
    >
      {label}
    </Text>
  )
}

export function DefaultGroupHeaderComponent({ label }: GroupHeaderProperties) {
  return (
    <Box>
      <Text dimColor>{`── ${label} ──`}</Text>
    </Box>
  )
}

export function DefaultSeparatorComponent() {
  return (
    <Box>
      <Text dimColor>{'─'.repeat(20)}</Text>
    </Box>
  )
}

export function EnhancedSelectInput<V>({
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  groupHeaderComponent = DefaultGroupHeaderComponent,
  separatorComponent = DefaultSeparatorComponent,
  showScrollIndicators = false,
  searchPlaceholder = 'Search...',
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
  } = useEnhancedSelectInput(hookProperties)

  const searchable = hookProperties.searchable === true

  if (!hasItems && !searchable) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent
  const GroupHeaderComponent = groupHeaderComponent
  const SeparatorComponent = separatorComponent
  const isVertical = hookProperties.orientation !== 'horizontal'
  const isMultiple = hookProperties.multiple === true

  const searchInput = searchable ? (
    <Box>
      <Text dimColor>
        {searchQuery ? `/ ${searchQuery}` : `/ ${searchPlaceholder}`}
      </Text>
    </Box>
  ) : null

  if (!hasItems) {
    // Searchable mode with no matching results
    return (
      <Box flexDirection="column">
        {searchInput}
        <Box>
          <Text dimColor>No matches</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection={isVertical ? 'column' : 'row'}>
      {searchInput}
      {showScrollIndicators && itemsAbove > 0 && (
        <Box marginRight={isVertical ? 0 : 1}>
          <Text dimColor>
            {isVertical ? `▲ ${itemsAbove} more` : `◀ ${itemsAbove} more`}
          </Text>
        </Box>
      )}
      <Box
        flexDirection={isVertical ? 'column' : 'row'}
        gap={isVertical ? 0 : 2}
      >
        {visibleItems.map((item, index) => {
          if (isSeparator(item)) {
            return (
              <SeparatorComponent
                key={item.key ?? `separator-${index + rotateIndex}`}
              />
            )
          }

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
          if (item.group && item.group !== groupOf(previousVisibleItem)) {
            groupHeader = (
              <GroupHeaderComponent
                key={`group-header-${index}-${item.group}`}
                label={item.group}
              />
            )
          }

          return (
            <React.Fragment key={itemKey(item)}>
              {groupHeader}
              <Box flexDirection="column">
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
                    />
                  )}
                  <ItemComponent
                    isSelected={isSelected}
                    label={item.label}
                    isDisabled={Boolean(item.disabled)}
                    isChecked={isChecked}
                    description={item.description}
                    hint={item.hint}
                    disabledReason={item.disabledReason}
                  />
                  {item.hint && <Text dimColor> {item.hint}</Text>}
                  {item.hotkey && !isMultiple && (
                    <Text dimColor color="gray">
                      {' '}
                      ({item.hotkey})
                    </Text>
                  )}
                  {item.disabled && item.disabledReason && (
                    <Text dimColor> — {item.disabledReason}</Text>
                  )}
                </Box>
                {item.description && (
                  <Box marginLeft={2}>
                    <Text dimColor>{item.description}</Text>
                  </Box>
                )}
              </Box>
            </React.Fragment>
          )
        })}
      </Box>
      {showScrollIndicators && itemsBelow > 0 && (
        <Box marginLeft={isVertical ? 0 : 1}>
          <Text dimColor>
            {isVertical ? `▼ ${itemsBelow} more` : `▶ ${itemsBelow} more`}
          </Text>
        </Box>
      )}
    </Box>
  )
}
