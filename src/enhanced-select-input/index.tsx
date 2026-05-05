import { Box, Text, useInput } from 'ink'
import React, { type FC, useEffect, useState } from 'react'

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

  return 0
}

export function findLastValidIndex<V>(items: Array<Item<V>>): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]?.disabled) return i
  }

  return items.length - 1
}

function itemKey<V>(item: Item<V>): string {
  return item.key ?? String(item.value)
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
}: UseEnhancedSelectInputProperties<V>): UseEnhancedSelectInputResult<V> {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter items based on search query
  const filteredItems =
    searchable && searchQuery
      ? items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items

  const safeInitialIndex = resolveInitialIndex(filteredItems, initialIndex)
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex)
  const [rotateIndex, setRotateIndex] = useState(
    limit ? Math.floor(safeInitialIndex / limit) * limit : 0
  )
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    () => new Set(defaultSelectedKeys ?? [])
  )

  const hasItems = filteredItems.length > 0
  const visibleItems = limit
    ? filteredItems.slice(rotateIndex, rotateIndex + limit)
    : filteredItems
  const itemsAbove = rotateIndex
  const itemsBelow = limit
    ? Math.max(0, filteredItems.length - rotateIndex - limit)
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
      if (limit) setRotateIndex(Math.floor(newIndex / limit) * limit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, searchQuery])

  // Only re-fire when the highlighted index changes, not when the items
  // array reference changes (which would cause spurious calls on every
  // parent re-render that passes a new array with identical content).
  useEffect(() => {
    if (hasItems) {
      const highlightedItem = filteredItems[selectedIndex]
      if (highlightedItem) {
        onHighlight?.(highlightedItem)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, onHighlight, hasItems])

  const updateSelection = (nextIndex: number) => {
    setSelectedIndex(nextIndex)
    if (limit) {
      setRotateIndex(Math.floor(nextIndex / limit) * limit)
    }
  }

  useInput(
    // eslint-disable-next-line complexity
    (input, key) => {
      // In searchable mode, handle Backspace to remove last character
      if (searchable && key.backspace) {
        setSearchQuery((previous) => previous.slice(0, -1))
        setSelectedIndex(0)
        if (limit) setRotateIndex(0)
        return
      }

      // In searchable mode, Escape clears the query first; if already
      // empty, it falls through to onCancel.
      if (searchable && key.escape && searchQuery) {
        setSearchQuery('')
        setSelectedIndex(0)
        if (limit) setRotateIndex(0)
        return
      }

      if (!hasItems && !searchable) return

      // eslint-disable-next-line unicorn/prevent-abbreviations
      const navKeys =
        orientation === 'vertical' ? VERTICAL_NAV_KEYS : HORIZONTAL_NAV_KEYS
      // eslint-disable-next-line unicorn/prevent-abbreviations
      const isNavKey = !searchable && navKeys.has(input)

      if (key.home) {
        updateSelection(findFirstValidIndex(filteredItems))
        return
      }

      if (key.end) {
        updateSelection(findLastValidIndex(filteredItems))
        return
      }

      if (key.escape) {
        onCancel?.()
        return
      }

      // Space: toggle in multi-select mode (but not in searchable mode
      // where space is a valid search character)
      if (multiple && !searchable && input === ' ') {
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

        return
      }

      let nextIndex = selectedIndex

      if (orientation === 'vertical') {
        if (key.upArrow || (!searchable && input === 'k')) {
          nextIndex = findNextValidIndex(filteredItems, selectedIndex, -1)
        }

        if (key.downArrow || (!searchable && input === 'j')) {
          nextIndex = findNextValidIndex(filteredItems, selectedIndex, 1)
        }
      } else {
        if (key.leftArrow || (!searchable && input === 'h')) {
          nextIndex = findNextValidIndex(filteredItems, selectedIndex, -1)
        }

        if (key.rightArrow || (!searchable && input === 'l')) {
          nextIndex = findNextValidIndex(filteredItems, selectedIndex, 1)
        }
      }

      if (nextIndex !== selectedIndex) {
        updateSelection(nextIndex)
      }

      if (key.return) {
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

        return
      }

      // In searchable mode, capture printable characters as search input.
      // This must come after navigation key handling.
      if (searchable && input && !key.ctrl && !key.meta) {
        setSearchQuery((previous) => previous + input)
        setSelectedIndex(0)
        if (limit) setRotateIndex(0)
        return
      }

      // Hotkeys: nav keys for the active orientation take priority.
      // Hotkeys are not active in multi-select or searchable mode.
      if (!multiple && !searchable && !isNavKey) {
        const hotkeyItem = filteredItems.find(
          (item) => item.hotkey === input && !item.disabled
        )
        if (hotkeyItem) {
          const hotkeyIndex = filteredItems.indexOf(hotkeyItem)
          updateSelection(hotkeyIndex)
          onSelect?.(hotkeyItem)
        }
      }
    },
    { isActive: isFocused }
  )

  return {
    selectedIndex,
    rotateIndex,
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

  // Track which groups have already rendered a header in this window.
  const renderedGroups = new Set<string>()

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
          let groupHeader: React.ReactNode = null
          if (item.group && !renderedGroups.has(item.group)) {
            renderedGroups.add(item.group)
            groupHeader = (
              <GroupHeaderComponent
                key={`group-header-${item.group}`}
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
