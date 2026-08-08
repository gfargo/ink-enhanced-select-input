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
  /** Page Up / Page Down keys — jump by a page of items. Default: true. */
  readonly pageKeys?: boolean
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

/**
 * Controls the built-in search matcher used when `filter` is not supplied.
 * `'includes'` is a case-insensitive substring match (the historical
 * behaviour). `'fuzzy'` is a case-insensitive ordered subsequence match —
 * the query's characters must appear in order, not necessarily contiguously.
 */
export type MatchMode = 'includes' | 'fuzzy'

/** Props accepted by the useEnhancedSelectInput hook (all behaviour, no rendering). */
export type UseEnhancedSelectInputProperties<V> = {
  readonly items: Array<ItemOrSeparator<V>>
  readonly isFocused?: boolean
  /**
   * Index of the item to highlight at mount. Ignored after mount — like
   * `initialValue`/`initialKey`, this is an initial-only prop, not a
   * controlled one. When several of `initialKey`, `initialValue`, and
   * `initialIndex` are supplied, `initialKey` wins, then `initialValue`,
   * then `initialIndex`.
   */
  readonly initialIndex?: number
  /**
   * Highlight the item whose `key` (or `String(value)` fallback) equals this
   * string at mount. Takes precedence over `initialValue` and `initialIndex`.
   * Initial-only — see {@link initialIndex}.
   */
  readonly initialKey?: string
  /**
   * Highlight the first item whose `value` matches this at mount, using `===`
   * (reference equality — for object values, prefer `initialKey`). Takes
   * precedence over `initialIndex` but not `initialKey`. Initial-only — see
   * {@link initialIndex}.
   */
  readonly initialValue?: V
  /**
   * When none of `initialKey`/`initialValue`/`initialIndex` resolve to an
   * item (or none are supplied), fall back to highlighting the first enabled
   * item. Set to `false` to start with no highlight instead — `selectedItem`
   * is `undefined`, `onHighlight` does not fire, and no cursor is rendered,
   * until the user navigates. Default: true.
   */
  readonly autoSelectFirstEnabled?: boolean
  /**
   * Controls the highlighted index from outside the component. When
   * provided, navigation/jump/hotkey/typeahead keypresses call
   * `onIndexChange` instead of moving the highlight internally — the parent
   * owns the value and must feed it back for the highlight to move.
   * Combine with `onIndexChange` for a fully controlled highlight. Do not
   * pass alongside `initialIndex`, which is ignored once this is set.
   */
  readonly selectedIndex?: number
  /**
   * Called with the next index whenever a keypress would move the highlight.
   * Only meaningful when `selectedIndex` is provided (controlled mode).
   */
  readonly onIndexChange?: (index: number) => void
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
  /**
   * How the pagination window advances when the cursor reaches its edge.
   * `'page'` (default) snaps the whole window to the next fixed page
   * boundary. `'scroll'` advances the window one row at a time so the
   * cursor stays where the eye already is — matching `ink-select-input`,
   * `fzf`, and `gum`. Only meaningful when `limit` is set.
   */
  readonly paginationMode?: 'page' | 'scroll'
  /**
   * In `'scroll'` pagination mode, the number of rows of context to keep
   * above/below the cursor before the window scrolls. Ignored in `'page'`
   * mode. Default: `0`.
   *
   * Internally clamped to `floor((limit - 1) / 2)` — larger values would
   * leave no stable cursor range between the "scroll up" and "scroll down"
   * margins, causing the window to jitter instead of scrolling one row at a
   * time.
   */
  readonly scrollOffset?: number
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
   * Controls the checked keys from outside the component. When provided,
   * `Space`/`toggle()` call `onSelectedKeysChange` instead of mutating the
   * checked set internally — the parent owns the value and must feed it
   * back for the checkboxes to update. Combine with `onSelectedKeysChange`
   * for a fully controlled multi-select. Do not pass alongside
   * `defaultSelectedKeys`, which is ignored once this is set. Only used
   * when `multiple` is true.
   */
  readonly selectedKeys?: string[]
  /**
   * Called with the next checked-keys array whenever `Space`/`toggle()`
   * would change the checked set. Only meaningful when `selectedKeys` is
   * provided (controlled mode).
   */
  readonly onSelectedKeysChange?: (keys: string[]) => void
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
   * Fully overrides the built-in search matching. When provided, an item is
   * included whenever `filter(item, query)` returns true — `matchMode` and
   * `searchFields` are ignored. Only used when `searchable` is true.
   */
  readonly filter?: (item: Item<V>, query: string) => boolean
  /**
   * Controls the built-in matcher used when `filter` is not supplied.
   * See {@link MatchMode}. Defaults to `'includes'`.
   */
  readonly matchMode?: MatchMode
  /**
   * Selects which text field(s) of an item the built-in matcher searches.
   * Defaults to searching `item.label` only. Return a single string or an
   * array of strings to search multiple fields — an item matches if any
   * field matches. Ignored when `filter` is supplied.
   */
  readonly searchFields?: (item: Item<V>) => string | string[]
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
  /**
   * Whether navigation (arrows, vim keys, Page Up/Down) wraps around at the
   * first/last item. When `false`, navigation clamps at the boundary instead
   * — pressing "down" on the last item keeps the highlight there rather than
   * jumping back to the top. Home/End are unaffected; they always jump to
   * the absolute boundary. Default: true.
   */
  readonly loop?: boolean
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
  // eslint-disable-next-line react/no-unused-prop-types
  readonly description?: string
  // eslint-disable-next-line react/no-unused-prop-types
  readonly hint?: string
  // eslint-disable-next-line react/no-unused-prop-types
  readonly disabledReason?: string
  /**
   * Matched character ranges (`[start, end)`, ascending, non-overlapping)
   * within `label` for the active search query, computed with the active
   * `matchMode`. Undefined outside searchable mode or when the query is
   * empty; an empty array when the query doesn't match the label (e.g. a
   * custom `filter` matched on a different field).
   */
  readonly matches?: ReadonlyArray<readonly [number, number]>
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

export type GroupHeaderProperties = {
  readonly label: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
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

/**
 * Resolves the index to highlight at mount from `initialKey`, `initialValue`,
 * `initialIndex`, and `autoSelectFirstEnabled`, in that precedence order.
 *
 * `autoSelectFirstEnabled` only governs the final fallback step, when none of
 * `initialKey`/`initialValue`/`initialIndex` resolve to a target — it does
 * NOT gate an explicit `initialIndex` (an out-of-range or otherwise
 * unmatched index is still clamped/resolved via `resolveInitialIndex`,
 * regardless of `autoSelectFirstEnabled`). Returns `-1` (no selection) only
 * when no target resolves at all and `autoSelectFirstEnabled` is explicitly
 * `false`.
 */
export function resolveInitialSelection<V>(
  items: Array<ItemOrSeparator<V>>,
  options: {
    initialKey?: string
    initialValue?: V
    initialIndex?: number
    autoSelectFirstEnabled?: boolean
  }
): number {
  const { initialKey, initialValue, initialIndex, autoSelectFirstEnabled } =
    options

  if (items.length === 0) {
    return autoSelectFirstEnabled === false ? -1 : 0
  }

  if (initialKey !== undefined) {
    const index = items.findIndex(
      (item) => !isSeparator(item) && itemKey(item) === initialKey
    )
    if (index !== -1) return resolveInitialIndex(items, index)
  }

  if (initialValue !== undefined) {
    const index = items.findIndex(
      (item) => !isSeparator(item) && item.value === initialValue
    )
    if (index !== -1) return resolveInitialIndex(items, index)
  }

  if (initialIndex !== undefined) {
    return resolveInitialIndex(items, initialIndex)
  }

  return autoSelectFirstEnabled === false ? -1 : resolveInitialIndex(items, 0)
}

export function findNextValidIndex<V>(
  items: Array<ItemOrSeparator<V>>,
  currentIndex: number,
  step: number,
  loop = true
): number {
  const itemCount = items.length
  if (itemCount === 0) return 0

  if (loop) {
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

  // Clamp mode: step without wrapping, skipping non-selectable items along
  // the way. Stops (stays put) once stepping again would run past the boundary.
  let nextIndex = currentIndex
  for (let i = 0; i < itemCount; i++) {
    const candidate = nextIndex + step
    if (candidate < 0 || candidate >= itemCount) break
    nextIndex = candidate
    if (isSelectable(items[nextIndex])) {
      return nextIndex
    }
  }

  return currentIndex
}

/** Default Page Up/Down step size when `limit` is not set (no visible window to size the page from). */
const DEFAULT_PAGE_SIZE = 10

/**
 * Moves `abs(delta)` valid steps in the direction of `delta`'s sign, skipping
 * non-selectable items exactly like {@link findNextValidIndex} at each step
 * and honouring `loop`. Stops early if a step doesn't move the index
 * (boundary reached in clamp mode, or no selectable item) rather than
 * spinning `abs(delta)` times for nothing.
 */
export function findPageIndex<V>(
  items: Array<ItemOrSeparator<V>>,
  currentIndex: number,
  delta: number,
  loop: boolean
): number {
  if (items.length === 0) return 0

  const step = delta < 0 ? -1 : 1
  const pageSize = Math.abs(delta)
  let index = currentIndex
  for (let i = 0; i < pageSize; i++) {
    const next = findNextValidIndex(items, index, step, loop)
    if (next === index) break
    index = next
  }

  return index
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

/**
 * Cursor-following pagination window for `paginationMode: 'scroll'`. Given
 * the previous window start, the newly-selected index, and the window size
 * (`limit`), returns the smallest change to the window start that keeps
 * `selectedIndex` within `[start + offset, start + limit - 1 - offset]` —
 * i.e. the window only moves when the cursor would otherwise leave it (or
 * leave its padded margin, when `offset > 0`), advancing one row at a time
 * rather than snapping to a fixed page boundary. The result is always
 * clamped to `[0, max(0, itemCount - limit)]`.
 *
 * `offset` is clamped to `floor((limit - 1) / 2)` before use. Beyond that,
 * the two margin checks (`< start + offset` / `> start + limit - 1 - offset`)
 * overlap — there is no cursor position that satisfies neither — so every
 * step would trip one branch, jittering the window backward or by more than
 * one row per keypress instead of scrolling smoothly.
 */
export function scrollWindowStart(
  previousStart: number,
  selectedIndex: number,
  limit: number,
  itemCount: number,
  offset = 0
): number {
  if (limit <= 0 || itemCount <= 0) return 0

  const maxStart = Math.max(0, itemCount - limit)
  const clampedOffset = Math.max(
    0,
    Math.min(offset, Math.floor((limit - 1) / 2))
  )
  let start = Math.max(0, Math.min(previousStart, maxStart))

  if (selectedIndex < start + clampedOffset) {
    start = selectedIndex - clampedOffset
  } else if (selectedIndex > start + limit - 1 - clampedOffset) {
    start = selectedIndex - limit + 1 + clampedOffset
  }

  return Math.max(0, Math.min(start, maxStart))
}

function itemKey<V>(item: Item<V>): string {
  return item.key ?? String(item.value)
}

/**
 * Whether `text` matches `query` under the given {@link MatchMode}. An empty
 * query always matches. `'includes'` is a case-insensitive substring test;
 * `'fuzzy'` is a case-insensitive ordered subsequence test (each query
 * character must appear in `text`, in order, not necessarily contiguously).
 *
 * Written as a plain index walk (no regex/split) since this runs once per
 * item per keystroke over the full (unpaginated) item list — see the 10k-item
 * benchmark in `large-list-performance.test.tsx`. The fuzzy walk compares
 * Unicode code points (via `codePointAt`), not UTF-16 code units, so astral
 * characters (e.g. emoji) that are encoded as surrogate pairs still compare
 * equal as a single character.
 */
export function matchesQuery(
  text: string,
  query: string,
  mode: MatchMode
): boolean {
  if (!query) return true
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()

  if (mode === 'fuzzy') {
    let textIndex = 0
    let queryIndex = 0
    while (queryIndex < normalizedQuery.length) {
      const queryCodePoint = normalizedQuery.codePointAt(queryIndex)!
      let found = false
      while (textIndex < normalizedText.length) {
        const textCodePoint = normalizedText.codePointAt(textIndex)!
        textIndex += textCodePoint > 0xff_ff ? 2 : 1
        if (textCodePoint === queryCodePoint) {
          found = true
          break
        }
      }

      if (!found) return false
      queryIndex += queryCodePoint > 0xff_ff ? 2 : 1
    }

    return true
  }

  return normalizedText.includes(normalizedQuery)
}

/**
 * Matched character ranges (`[start, end)`, ascending, non-overlapping) of
 * `query` within `text` under the given {@link MatchMode}. Returns `[]` for
 * an empty query or no match. `'includes'` yields a single range at the
 * substring's position; `'fuzzy'` yields one range per matched character,
 * merging adjacent indices into contiguous ranges.
 */
export function computeMatchRanges(
  text: string,
  query: string,
  mode: MatchMode
): Array<[number, number]> {
  if (!query) return []
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()

  if (mode === 'fuzzy') {
    const ranges: Array<[number, number]> = []
    let searchFrom = 0
    let queryIndex = 0
    while (queryIndex < normalizedQuery.length) {
      const queryCodePoint = normalizedQuery.codePointAt(queryIndex)!
      let matchIndex = -1
      let matchEnd = -1
      for (let i = searchFrom; i < normalizedText.length; ) {
        const textCodePoint = normalizedText.codePointAt(i)!
        const textCharLength = textCodePoint > 0xff_ff ? 2 : 1
        if (textCodePoint === queryCodePoint) {
          matchIndex = i
          matchEnd = i + textCharLength
          break
        }

        i += textCharLength
      }

      if (matchIndex === -1) return []

      const lastRange = ranges.at(-1)
      if (lastRange && lastRange[1] === matchIndex) {
        lastRange[1] = matchEnd
      } else {
        ranges.push([matchIndex, matchEnd])
      }

      searchFrom = matchEnd
      queryIndex += queryCodePoint > 0xff_ff ? 2 : 1
    }

    return ranges
  }

  const index = normalizedText.indexOf(normalizedQuery)
  return index === -1 ? [] : [[index, index + normalizedQuery.length]]
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
  /** Whether navigation wraps around at the first/last item. Defaults to true. */
  loop?: boolean
  /** Number of items a Page Up/Down press moves. Defaults to {@link DEFAULT_PAGE_SIZE}. */
  pageSize?: number
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
  | { type: 'select-all' }
  | { type: 'select-none' }
  | { type: 'invert' }
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

/** Page Up/Down, gated on `km.pageKeys` — moves a page of items at a time, honoring `loop`. */
function resolvePageIntent<V>(
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { km, filteredItems, selectedIndex } = context
  const loop = context.loop ?? true
  const pageSize = context.pageSize ?? DEFAULT_PAGE_SIZE

  if (km.pageKeys && key.pageUp) {
    return {
      type: 'navigate',
      index: findPageIndex(filteredItems, selectedIndex, -pageSize, loop),
    }
  }

  if (km.pageKeys && key.pageDown) {
    return {
      type: 'navigate',
      index: findPageIndex(filteredItems, selectedIndex, pageSize, loop),
    }
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

  // No item is highlighted yet (autoSelectFirstEnabled: false and nothing
  // resolved at mount) — seed the selection at the boundary the step points
  // toward instead of stepping relative to a nonexistent -1 position.
  if (context.selectedIndex === -1) {
    const seeded =
      step === 1
        ? findFirstValidIndex(context.filteredItems)
        : findLastValidIndex(context.filteredItems)
    return { type: 'navigate', index: seeded }
  }

  return {
    type: 'navigate',
    index: findNextValidIndex(
      context.filteredItems,
      context.selectedIndex,
      step,
      context.loop ?? true
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
    filteredItems.some((item) => isSelectable(item) && item.hotkey === input)

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
    (item): item is Item<V> => isSelectable(item) && item.hotkey === input
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
    pageKeys: keyMap?.pageKeys ?? true,
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

  const page = resolvePageIntent(key, context)
  if (page) return page

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
  initialIndex: rawInitialIndex,
  initialKey,
  initialValue,
  autoSelectFirstEnabled = true,
  selectedIndex: controlledIndex,
  onIndexChange,
  limit,
  paginationMode = 'page',
  scrollOffset = 0,
  onSelect,
  onHighlight,
  onCancel,
  orientation = 'vertical',
  multiple = false,
  defaultSelectedKeys,
  selectedKeys: controlledKeys,
  onSelectedKeysChange,
  onConfirm,
  confirmScope = 'all',
  onToggle,
  minSelections,
  maxSelections,
  searchable = false,
  filter,
  matchMode = 'includes',
  searchFields,
  keyMap,
  typeahead = false,
  typeaheadTimeout = 500,
  loop = true,
}: UseEnhancedSelectInputProperties<V>): UseEnhancedSelectInputResult<V> {
  const km = resolveKeyMap(keyMap)
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
  const filteredItems = useMemo<Array<ItemOrSeparator<V>>>(() => {
    if (!searchable || !searchQuery) return items
    const nonSeparatorItems = items.filter(
      (item): item is Item<V> => !isSeparator(item)
    )
    if (filter)
      return nonSeparatorItems.filter((item) => filter(item, searchQuery))
    return nonSeparatorItems.filter((item) => {
      const fields = searchFields ? searchFields(item) : item.label
      const fieldList = Array.isArray(fields) ? fields : [fields]
      return fieldList.some((field) =>
        matchesQuery(field, searchQuery, matchMode)
      )
    })
  }, [items, searchable, searchQuery, filter, matchMode, searchFields])

  // Pagination windows ("pages") are computed against rendered row count —
  // items plus the group headers injected before them — not raw item count,
  // so `limit` bounds what actually appears on screen.
  const pageStarts = useMemo(
    () => (limit ? computePageStarts(filteredItems, limit) : []),
    [filteredItems, limit]
  )

  const safeInitialIndex = resolveInitialSelection(filteredItems, {
    initialKey,
    initialValue,
    initialIndex: rawInitialIndex,
    autoSelectFirstEnabled,
  })
  const [uncontrolledIndex, setUncontrolledIndex] = useState(safeInitialIndex)
  const isIndexControlled = controlledIndex !== undefined
  const selectedIndex = isIndexControlled
    ? resolveInitialIndex(filteredItems, controlledIndex)
    : uncontrolledIndex
  // Latest-value ref so the revalidation effect can read the current
  // selectedIndex without listing it as a dependency (which would make the
  // effect re-run on every navigation keypress instead of only when the
  // filtered item set changes).
  const selectedIndexReference = useRef(selectedIndex)
  selectedIndexReference.current = selectedIndex
  // Latest-value ref so the sync-back effects below can call the parent's
  // callback without listing it as a dependency — an inline arrow function
  // (as shown in the README) is a new reference every render and would
  // otherwise re-run those effects on every render instead of only when the
  // resolved value actually diverges from the controlled prop.
  const onIndexChangeReference = useRef(onIndexChange)
  onIndexChangeReference.current = onIndexChange
  const onSelectedKeysChangeReference = useRef(onSelectedKeysChange)
  onSelectedKeysChangeReference.current = onSelectedKeysChange
  const isKeysControlled = controlledKeys !== undefined
  const [uncontrolledCheckedKeys, setUncontrolledCheckedKeys] = useState<
    Set<string>
  >(() => {
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
  const controlledCheckedKeys = useMemo(() => {
    if (!isKeysControlled) return undefined
    const disabledKeys = new Set(
      items
        .filter(
          (item): item is Item<V> =>
            !isSeparator(item) && Boolean(item.disabled)
        )
        .map((item) => itemKey(item))
    )
    return new Set(controlledKeys.filter((key) => !disabledKeys.has(key)))
  }, [isKeysControlled, controlledKeys, items])
  const checkedKeys = controlledCheckedKeys ?? uncontrolledCheckedKeys
  // Mirrors `checkedKeys` synchronously so the Enter branch below can read
  // the committed set even when a Space toggle and Enter are written in the
  // same tick (no intervening render to flush the `checkedKeys` state).
  const checkedKeysReference = useRef(checkedKeys)
  checkedKeysReference.current = checkedKeys
  const typeaheadBuffer = useRef<{ text: string; time: number }>({
    text: '',
    time: 0,
  })
  // Cursor-following window start for `paginationMode: 'scroll'`. Persisted
  // across renders (unlike page mode, which derives its window purely from
  // selectedIndex) because the scroll window's position depends on its own
  // previous position, not just the current selection.
  const windowStartReference = useRef(0)

  // Keep the parent in sync when a controlled selectedKeys resolves to a
  // smaller set than what was passed in — e.g. a previously-checked item
  // became disabled and is now filtered out of `controlledCheckedKeys`
  // above. Without this the parent's own copy of the keys would silently
  // include a key that no longer renders as checked.
  useEffect(() => {
    if (!isKeysControlled || !controlledCheckedKeys) return
    if (controlledCheckedKeys.size !== controlledKeys.length) {
      onSelectedKeysChangeReference.current?.([...controlledCheckedKeys])
    }
  }, [isKeysControlled, controlledCheckedKeys, controlledKeys])

  const hasItems = filteredItems.length > 0
  // Derive the pagination window offset directly from selectedIndex (plus,
  // in scroll mode, the previous window start) so there is a single source
  // of truth. In 'page' mode, pageStartFor finds the largest page-start that
  // is <= selectedIndex, keeping the selection inside the visible window
  // even when limit or pageStarts change at runtime (e.g. terminal resize).
  // Both lookups are binary searches — pageStarts is strictly ascending — so
  // per-render cost is O(log pages) rather than O(pages).
  let effectiveRotateIndex: number
  let visibleItems: Array<ItemOrSeparator<V>>
  if (limit && paginationMode === 'scroll') {
    const windowStart = scrollWindowStart(
      windowStartReference.current,
      selectedIndex,
      limit,
      filteredItems.length,
      scrollOffset
    )
    windowStartReference.current = windowStart
    effectiveRotateIndex = windowStart
    visibleItems = filteredItems.slice(windowStart, windowStart + limit)
  } else {
    effectiveRotateIndex = limit ? pageStartFor(pageStarts, selectedIndex) : 0
    const currentPageIndex = pageIndexOfStart(pageStarts, effectiveRotateIndex)
    const nextPageStart =
      currentPageIndex !== -1 && currentPageIndex + 1 < pageStarts.length
        ? pageStarts[currentPageIndex + 1]
        : filteredItems.length
    visibleItems = limit
      ? filteredItems.slice(effectiveRotateIndex, nextPageStart)
      : filteredItems
  }

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
  // Page Up/Down step by the number of items currently on screen — matching
  // what the user actually sees scroll by a "page" — falling back to a fixed
  // size when there's no `limit` (the whole list is already visible, so
  // there's no on-screen page to size the step from).
  const pageSize = limit ? Math.max(1, visibleItems.length) : DEFAULT_PAGE_SIZE

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

    const keys = items
      .filter((item): item is Item<V> => !isSeparator(item))
      .map((item) => itemKey(item))
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
  // Skipped when the index is controlled: the parent owns the value, and
  // `selectedIndex` above already resolves a controlled value to a safe,
  // in-range index for reads (pagination, `filteredItems[selectedIndex]`)
  // without writing back to the parent.
  useEffect(() => {
    if (isIndexControlled) return
    // The "no selection" state (autoSelectFirstEnabled: false, nothing
    // resolved yet) must survive item/filter changes rather than snapping to
    // an item the user never asked for — only navigation should leave it.
    if (selectedIndexReference.current === -1) return

    if (filteredItems.length === 0) {
      setUncontrolledIndex(0)
      return
    }

    const currentItem = filteredItems[selectedIndexReference.current]
    if (!isSelectable(currentItem)) {
      const newIndex = resolveInitialIndex(
        filteredItems,
        selectedIndexReference.current
      )
      setUncontrolledIndex(newIndex)
    }
  }, [filteredItems, limit, pageStarts, isIndexControlled])

  // Keep the parent in sync when a controlled selectedIndex resolves to a
  // different value than what was passed in — e.g. items shrank and the
  // index fell out of range, or it landed on a disabled item.
  // `resolveInitialIndex` above already picks a safe value for rendering,
  // but without this the parent's own copy of the index would silently
  // diverge from what is actually highlighted until the user's next
  // keypress happens to fire onIndexChange.
  useEffect(() => {
    if (!isIndexControlled) return
    if (selectedIndex !== controlledIndex) {
      onIndexChangeReference.current?.(selectedIndex)
    }
  }, [isIndexControlled, selectedIndex, controlledIndex])

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

  // Warn in development when a controlled prop is combined with its
  // uncontrolled counterpart — the uncontrolled prop is silently ignored
  // once the controlled prop is set, which is easy to miss.
  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (isIndexControlled && rawInitialIndex !== undefined) {
      console.warn(
        '[ink-enhanced-select-input] selectedIndex and initialIndex were both provided — ' +
          'initialIndex is ignored once selectedIndex (controlled mode) is set.'
      )
    }
  }, [isIndexControlled, rawInitialIndex])

  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (isKeysControlled && defaultSelectedKeys !== undefined) {
      console.warn(
        '[ink-enhanced-select-input] selectedKeys and defaultSelectedKeys were both provided — ' +
          'defaultSelectedKeys is ignored once selectedKeys (controlled mode) is set.'
      )
    }
  }, [isKeysControlled, defaultSelectedKeys])

  // Warn in development when a controlled prop is passed without its change
  // handler — the analogue of React's "value prop without onChange" warning.
  // Without the handler the highlight/checkboxes are frozen: every keypress
  // still computes a next value, but nothing ever feeds it back through the
  // controlled prop, so the UI silently stops responding.
  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (isIndexControlled && onIndexChange === undefined) {
      console.warn(
        '[ink-enhanced-select-input] selectedIndex was provided without onIndexChange — ' +
          'the highlight will not respond to navigation. Pass onIndexChange to update it.'
      )
    }
  }, [isIndexControlled, onIndexChange])

  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (isKeysControlled && onSelectedKeysChange === undefined) {
      console.warn(
        '[ink-enhanced-select-input] selectedKeys was provided without onSelectedKeysChange — ' +
          'checkboxes will not respond to toggling. Pass onSelectedKeysChange to update them.'
      )
    }
  }, [isKeysControlled, onSelectedKeysChange])

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

  // Commits the next highlighted index. In controlled mode, only notifies
  // the parent via `onIndexChange` — the parent must feed the value back
  // through `selectedIndex` for the highlight to actually move. In
  // uncontrolled mode, updates internal state directly.
  const updateSelection = (nextIndex: number) => {
    onIndexChange?.(nextIndex)
    if (!isIndexControlled) setUncontrolledIndex(nextIndex)
  }

  // Commits the next checked-keys set. In controlled mode, only notifies the
  // parent via `onSelectedKeysChange` — the parent must feed the value back
  // through `selectedKeys` for the checked set to actually change. In
  // uncontrolled mode, updates internal state directly.
  const updateCheckedKeys = (next: Set<string>) => {
    checkedKeysReference.current = next
    onSelectedKeysChange?.([...next])
    if (!isKeysControlled) setUncontrolledCheckedKeys(next)
  }

  // Search edits (append/backspace/clear) highlight the top match — but must
  // preserve the no-selection sentinel (autoSelectFirstEnabled: false,
  // nothing resolved yet) rather than snapping to item 0, the same rule the
  // filtered-items revalidation effect applies below.
  const resetSelectionToTopUnlessUnselected = () => {
    if (selectedIndex !== -1) updateSelection(0)
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
    onToggle?.(target, willCheck)
    updateCheckedKeys(next)
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
      if (!isSelectable(item)) continue
      if (maxSelections !== undefined && next.size >= maxSelections) break
      next.add(itemKey(item))
    }

    updateCheckedKeys(next)
  }

  const selectNone = () => {
    if (!multiple) return
    updateCheckedKeys(new Set<string>())
  }

  const invertSelection = () => {
    if (!multiple) return
    const { current } = checkedKeysReference
    const next = new Set(current)
    for (const item of filteredItems) {
      if (!isSelectable(item)) continue
      const k = itemKey(item)
      if (next.has(k)) {
        next.delete(k)
      } else if (maxSelections === undefined || next.size < maxSelections) {
        next.add(k)
      }
    }

    updateCheckedKeys(next)
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
    setSearchQueryState(query)
    resetSelectionToTopUnlessUnselected()
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
      const confirmed = confirmSource.filter(
        (item): item is Item<V> =>
          !isSeparator(item) && checkedKeysReference.current.has(itemKey(item))
      )
      onConfirm?.(confirmed)
      return
    }

    const itemToSelect = filteredItems[selectedIndex]
    if (isSelectable(itemToSelect)) {
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
        isSelectable(item) &&
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
        searchQuery,
        hasItems,
        multiple,
        orientation,
        selectedIndex,
        filteredItems,
        typeahead,
        typeaheadActive: typeaheadIsActive,
        loop,
        pageSize,
      })

      switch (intent.type) {
        case 'search-backspace': {
          setSearchQueryState((previous) => previous.slice(0, -1))
          resetSelectionToTopUnlessUnselected()
          break
        }

        case 'search-clear': {
          setSearchQueryState('')
          resetSelectionToTopUnlessUnselected()
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

        case 'search-append': {
          setSearchQueryState((previous) => previous + intent.char)
          resetSelectionToTopUnlessUnselected()
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
  matches,
  theme,
}: ItemProperties) {
  const resolvedTheme = theme ?? resolveTheme()
  let color: string | undefined
  if (isDisabled) {
    color = resolvedTheme.disabled
  } else if (isSelected) {
    color = resolvedTheme.selected
  }

  if (!matches || matches.length === 0) {
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

  const segments: React.ReactNode[] = []
  let cursor = 0
  for (const [start, end] of matches) {
    if (start > cursor) segments.push(label.slice(cursor, start))
    segments.push(
      <Text key={`match-${start}-${end}`} bold>
        {label.slice(start, end)}
      </Text>
    )
    cursor = end
  }

  if (cursor < label.length) segments.push(label.slice(cursor))

  return (
    <Text
      color={color}
      dimColor={isDisabled && resolvedTheme.dim}
      wrap="truncate-end"
    >
      {segments}
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

export function DefaultSeparatorComponent() {
  return (
    <Box>
      <Text dimColor>{'─'.repeat(20)}</Text>
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
  separatorComponent = DefaultSeparatorComponent,
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
    selectionCount,
  } = useEnhancedSelectInput(hookProperties)

  const resolvedTheme = resolveTheme(theme)
  const searchable = hookProperties.searchable === true
  const matchMode = hookProperties.matchMode ?? 'includes'

  if (!hasItems && !searchable) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent
  const GroupHeaderComponent = groupHeaderComponent
  const SeparatorComponent = separatorComponent
  // A custom itemComponent receives description/hint/disabledReason as props
  // specifically so it can render them itself. Rendering them again here
  // would duplicate that text, so the parent only renders them for the
  // built-in default, which ignores those props.
  const isDefaultItemComponent = itemComponent === DefaultItemComponent
  const isVertical = hookProperties.orientation !== 'horizontal'
  const isMultiple = hookProperties.multiple === true

  const searchInput = searchable ? (
    <Box>
      <Text
        color={resolvedTheme.searchPlaceholder}
        dimColor={resolvedTheme.dim}
      >
        {searchQuery ? `/ ${searchQuery}` : `/ ${searchPlaceholder}`}
      </Text>
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
            const matches =
              searchable && searchQuery
                ? computeMatchRanges(item.label, searchQuery, matchMode)
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
                  theme={resolvedTheme}
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
                      description={item.description}
                      hint={item.hint}
                      disabledReason={item.disabledReason}
                      matches={matches}
                      theme={resolvedTheme}
                    />
                    {isDefaultItemComponent && item.hint && (
                      <Text dimColor={resolvedTheme.dim}> {item.hint}</Text>
                    )}
                    {item.hotkey && !isMultiple && (
                      <Text
                        dimColor={resolvedTheme.dim}
                        color={resolvedTheme.hotkey}
                      >
                        {' '}
                        ({item.hotkey})
                      </Text>
                    )}
                    {isDefaultItemComponent &&
                      item.disabled &&
                      item.disabledReason && (
                        <Text dimColor={resolvedTheme.dim}>
                          {' '}
                          — {item.disabledReason}
                        </Text>
                      )}
                  </Box>
                  {isDefaultItemComponent && item.description && (
                    <Box marginLeft={2}>
                      <Text dimColor={resolvedTheme.dim}>
                        {item.description}
                      </Text>
                    </Box>
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
