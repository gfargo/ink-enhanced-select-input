import { Box, Text, useInput, type Key } from 'ink'
import React, { type FC, useEffect, useMemo, useState } from 'react'

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
}

/** Props accepted by the useEnhancedSelectInput hook (all behaviour, no rendering). */
export type UseEnhancedSelectInputProperties<V> = {
  readonly items: Array<Item<V>>
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
}

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
}

export type GroupHeaderProperties = {
  readonly label: string
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

/** Largest page-start index in `pageStarts` that is `<= index`. */
function pageStartFor(pageStarts: number[], index: number): number {
  let result = 0
  for (const start of pageStarts) {
    if (start <= index) result = start
    else break
  }

  return result
}

function itemKey<V>(item: Item<V>): string {
  return item.key ?? String(item.value)
}

/** Fully-resolved key map — every group explicitly enabled or disabled. */
type ResolvedKeyMap = Required<KeyMap>

/** Everything the intent resolver needs to read, without touching React state. */
type InputIntentContext<V> = {
  km: ResolvedKeyMap
  searchable: boolean
  searchQuery: string
  hasItems: boolean
  multiple: boolean
  orientation: 'vertical' | 'horizontal'
  selectedIndex: number
  filteredItems: Array<Item<V>>
}

/**
 * The single normalized intent a keypress maps to. Every modifier/mode guard
 * (keyMap flags, searchable, multiple, active-vim-key) is evaluated exactly
 * once, inside {@link resolveInputIntent}, to produce one of these — the
 * `useInput` handler then dispatches on `type` alone with no further
 * guarding.
 */
type Intent<V> =
  | { type: 'none' }
  | { type: 'search-backspace' }
  | { type: 'search-clear' }
  | { type: 'jump'; index: number }
  | { type: 'cancel' }
  | { type: 'toggle' }
  | { type: 'navigate'; index: number }
  | { type: 'submit' }
  | { type: 'search-append'; char: string }
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
  context: InputIntentContext<V>
): -1 | 1 | undefined {
  const { km, orientation, searchable } = context
  const [backwardArrow, forwardArrow, backwardVimKey, forwardVimKey] =
    orientation === 'vertical'
      ? [key.upArrow, key.downArrow, 'k', 'j']
      : [key.leftArrow, key.rightArrow, 'h', 'l']

  if (
    (km.arrows && backwardArrow) ||
    (km.vimKeys && !searchable && input === backwardVimKey)
  ) {
    return -1
  }

  if (
    (km.arrows && forwardArrow) ||
    (km.vimKeys && !searchable && input === forwardVimKey)
  ) {
    return 1
  }

  return undefined
}

/** Arrow/vim-key navigation. Terminal: a nav key never also matches submit/search/hotkey. */
function resolveNavigateIntent<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const step = resolveNavigateStep(input, key, context)
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
 * Item hotkeys. Not active in multi-select or searchable mode, and active
 * vim nav keys (which take priority over a same-character hotkey) are
 * resolved here too.
 */
function resolveHotkeyIntent<V>(
  input: string,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { km, multiple, searchable, orientation, filteredItems } = context
  const navigationKeys =
    orientation === 'vertical' ? VERTICAL_NAV_KEYS : HORIZONTAL_NAV_KEYS
  const isActiveVimKey = km.vimKeys && !searchable && navigationKeys.has(input)

  if (!km.select || multiple || searchable || isActiveVimKey) {
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
  const { km, searchable, hasItems, multiple } = context

  const searchEdit = resolveSearchEditIntent(key, context)
  if (searchEdit) return searchEdit

  if (!hasItems && !searchable) {
    return { type: 'none' }
  }

  const jump = resolveJumpIntent(key, context)
  if (jump) return jump

  if (km.cancel && key.escape) {
    return { type: 'cancel' }
  }

  // Space: toggle in multi-select mode (but not in searchable mode where
  // space is a valid search character)
  if (km.toggle && multiple && !searchable && input === ' ') {
    return { type: 'toggle' }
  }

  const navigate = resolveNavigateIntent(input, key, context)
  if (navigate) return navigate

  if (km.select && key.return) {
    return { type: 'submit' }
  }

  // In searchable mode, capture printable characters as search input.
  // This must come after navigation key handling.
  if (searchable && input && !key.ctrl && !key.meta) {
    return { type: 'search-append', char: input }
  }

  const hotkey = resolveHotkeyIntent(input, context)
  if (hotkey) return hotkey

  return { type: 'none' }
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
  onToggle,
  searchable = false,
  keyMap,
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
  const [searchQuery, setSearchQuery] = useState('')

  // Filter items based on search query
  const filteredItems =
    searchable && searchQuery
      ? items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items

  // Pagination windows ("pages") are computed against rendered row count —
  // items plus the group headers injected before them — not raw item count,
  // so `limit` bounds what actually appears on screen.
  const pageStarts = useMemo(
    () => (limit ? computePageStarts(filteredItems, limit) : []),
    [filteredItems, limit]
  )

  const safeInitialIndex = resolveInitialIndex(filteredItems, initialIndex)
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex)
  const [rotateIndex, setRotateIndex] = useState(
    limit ? pageStartFor(pageStarts, safeInitialIndex) : 0
  )
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    () => new Set(defaultSelectedKeys ?? [])
  )

  const hasItems = filteredItems.length > 0
  // `rotateIndex` can go stale relative to `pageStarts` when `limit` changes
  // without the selection moving (e.g. a consumer shrinking `limit` to fit a
  // resized terminal) — pageStarts recomputes but rotateIndex doesn't. Snap
  // it down to the nearest valid page start on every render rather than
  // requiring an exact match, so the visible window is always bounded by the
  // current `limit` even mid-transition.
  const effectiveRotateIndex = limit ? pageStartFor(pageStarts, rotateIndex) : 0
  const currentPageIndex = pageStarts.indexOf(effectiveRotateIndex)
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

  // When the items array changes, re-validate the current selectedIndex.
  // If the item at that position is still enabled we keep it; otherwise we
  // resolve the nearest valid index from the same position, so the selection
  // stays as close as possible to where the user left off.
  // Also warn in development when duplicate React keys are detected —
  // this happens when V is an object and item.key is not set, causing
  // String(value) to produce "[object Object]" for every item.
  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] !== 'production' && items.length > 0) {
      const keys = items.map((item) => itemKey(item))
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

    if (filteredItems.length === 0) {
      setSelectedIndex(0)
      if (limit) setRotateIndex(0)
      return
    }

    const currentItem = filteredItems[selectedIndex]
    if (!currentItem || currentItem.disabled) {
      const newIndex = resolveInitialIndex(filteredItems, selectedIndex)
      setSelectedIndex(newIndex)
      if (limit) setRotateIndex(pageStartFor(pageStarts, newIndex))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchQuery])

  // Only re-fire when the highlighted index changes, not when the items
  // array reference changes (which would cause spurious calls on every
  // parent re-render that passes a new array with identical content).
  useEffect(() => {
    if (hasItems) {
      const highlightedItem = filteredItems[selectedIndex]
      if (highlightedItem && !highlightedItem.disabled) {
        onHighlight?.(highlightedItem)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, onHighlight, hasItems])

  const updateSelection = (nextIndex: number) => {
    setSelectedIndex(nextIndex)
    if (limit) {
      setRotateIndex(pageStartFor(pageStarts, nextIndex))
    }
  }

  useInput(
    (input, key) => {
      const intent = resolveInputIntent(input, key, {
        km,
        searchable,
        searchQuery,
        hasItems,
        multiple,
        orientation,
        selectedIndex,
        filteredItems,
      })

      switch (intent.type) {
        case 'search-backspace': {
          setSearchQuery((previous) => previous.slice(0, -1))
          setSelectedIndex(0)
          if (limit) setRotateIndex(0)
          break
        }

        case 'search-clear': {
          setSearchQuery('')
          setSelectedIndex(0)
          if (limit) setRotateIndex(0)
          break
        }

        case 'jump': {
          updateSelection(intent.index)
          break
        }

        case 'cancel': {
          onCancel?.()
          break
        }

        case 'toggle': {
          const item = filteredItems[selectedIndex]
          if (item && !item.disabled) {
            const k = itemKey(item)
            setCheckedKeys((previous) => {
              const next = new Set(previous)
              const nowChecked = !next.has(k)
              if (nowChecked) next.add(k)
              else next.delete(k)
              onToggle?.(item, nowChecked)
              return next
            })
          }

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
            // In multi-select mode Enter confirms the full selection
            const confirmed = filteredItems.filter((item) =>
              checkedKeys.has(itemKey(item))
            )
            onConfirm?.(confirmed)
          } else {
            const selectedItem = filteredItems[selectedIndex]
            if (selectedItem && !selectedItem.disabled) {
              onSelect?.(selectedItem)
            }
          }

          break
        }

        case 'search-append': {
          setSearchQuery((previous) => previous + intent.char)
          setSelectedIndex(0)
          if (limit) setRotateIndex(0)
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

export function EnhancedSelectInput<V>({
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  groupHeaderComponent = DefaultGroupHeaderComponent,
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
          const isSelected = index + rotateIndex === selectedIndex
          const isChecked = isMultiple
            ? checkedKeys.has(item.key ?? String(item.value))
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
              />
            )
          }

          return (
            <React.Fragment key={item.key ?? String(item.value)}>
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
                  />
                )}
                <ItemComponent
                  isSelected={isSelected}
                  label={item.label}
                  isDisabled={Boolean(item.disabled)}
                  isChecked={isChecked}
                />
                {item.hotkey && !isMultiple && (
                  <Text dimColor color="gray">
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
          <Text dimColor>
            {isVertical ? `▼ ${itemsBelow} more` : `▶ ${itemsBelow} more`}
          </Text>
        </Box>
      )}
    </Box>
  )
}
