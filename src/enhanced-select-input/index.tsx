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
}

/** Full component props — hook props plus rendering customisation. */
export type Properties<V> = UseEnhancedSelectInputProperties<V> & {
  readonly indicatorComponent?: FC<IndicatorProperties>
  readonly itemComponent?: FC<ItemProperties>
  /**
   * Show ▲/▼ (vertical) or ◀/▶ (horizontal) indicators with item counts
   * when the limit window doesn't cover the full list. Only meaningful when
   * `limit` is set. Defaults to false.
   */
  readonly showScrollIndicators?: boolean
}

export type IndicatorProperties = {
  readonly isSelected: boolean
  // eslint-disable-next-line  react/no-unused-prop-types
  readonly item: Item<unknown>
}

export type ItemProperties = {
  readonly isSelected: boolean
  readonly label: string
  readonly isDisabled: boolean
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
  for (let i = 0; i < items.length; i++) {
    if (!items[i]?.disabled) return i
  }

  return 0
}

export function findLastValidIndex<V>(items: Array<Item<V>>): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]?.disabled) return i
  }

  return items.length - 1
}

export type UseEnhancedSelectInputResult<V> = {
  /** Index of the currently highlighted item within the full items array. */
  selectedIndex: number
  /** Start of the current pagination window (0 when limit is not set). */
  rotateIndex: number
  /** The slice of items visible in the current window. */
  visibleItems: Array<Item<V>>
  /** True when items is non-empty. */
  hasItems: boolean
  /** Number of items hidden above the current window. */
  itemsAbove: number
  /** Number of items hidden below the current window. */
  itemsBelow: number
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
}: UseEnhancedSelectInputProperties<V>): UseEnhancedSelectInputResult<V> {
  const safeInitialIndex = resolveInitialIndex(items, initialIndex)
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex)
  const [rotateIndex, setRotateIndex] = useState(
    limit ? Math.floor(safeInitialIndex / limit) * limit : 0
  )

  const hasItems = items.length > 0
  const visibleItems = limit
    ? items.slice(rotateIndex, rotateIndex + limit)
    : items
  const itemsAbove = rotateIndex
  const itemsBelow = limit ? Math.max(0, items.length - rotateIndex - limit) : 0

  // When the items array changes, re-validate the current selectedIndex.
  // If the item at that position is still enabled we keep it; otherwise we
  // resolve the nearest valid index from the same position, so the selection
  // stays as close as possible to where the user left off.
  useEffect(() => {
    if (items.length === 0) return
    const currentItem = items[selectedIndex]
    if (!currentItem || currentItem.disabled) {
      const newIndex = resolveInitialIndex(items, selectedIndex)
      setSelectedIndex(newIndex)
      if (limit) setRotateIndex(Math.floor(newIndex / limit) * limit)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  // Only re-fire when the highlighted index changes, not when the items
  // array reference changes (which would cause spurious calls on every
  // parent re-render that passes a new array with identical content).
  useEffect(() => {
    if (hasItems) {
      const highlightedItem = items[selectedIndex]
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
    (input, key) => {
      if (!hasItems) return

      const navKeys =
        orientation === 'vertical' ? VERTICAL_NAV_KEYS : HORIZONTAL_NAV_KEYS
      const isNavKey = navKeys.has(input)

      if (key.home) {
        updateSelection(findFirstValidIndex(items))
        return
      }

      if (key.end) {
        updateSelection(findLastValidIndex(items))
        return
      }

      if (key.escape) {
        onCancel?.()
        return
      }

      let nextIndex = selectedIndex

      if (orientation === 'vertical') {
        if (key.upArrow || input === 'k') {
          nextIndex = findNextValidIndex(items, selectedIndex, -1)
        }

        if (key.downArrow || input === 'j') {
          nextIndex = findNextValidIndex(items, selectedIndex, 1)
        }
      } else {
        if (key.leftArrow || input === 'h') {
          nextIndex = findNextValidIndex(items, selectedIndex, -1)
        }

        if (key.rightArrow || input === 'l') {
          nextIndex = findNextValidIndex(items, selectedIndex, 1)
        }
      }

      if (nextIndex !== selectedIndex) {
        updateSelection(nextIndex)
      }

      if (key.return) {
        const selectedItem = items[selectedIndex]
        if (selectedItem && !selectedItem.disabled) {
          onSelect?.(selectedItem)
        }
      }

      // Hotkeys: nav keys for the active orientation take priority.
      // See README "Keyboard Navigation" for reserved key constraints.
      if (!isNavKey) {
        const hotkeyItem = items.find(
          (item) => item.hotkey === input && !item.disabled
        )
        if (hotkeyItem) {
          const hotkeyIndex = items.indexOf(hotkeyItem)
          updateSelection(hotkeyIndex)
          onSelect?.(hotkeyItem)
        }
      }
    },
    { isActive: isFocused }
  )

  return { selectedIndex, rotateIndex, visibleItems, hasItems, itemsAbove, itemsBelow }
}

export function DefaultIndicatorComponent({ isSelected }: IndicatorProperties) {
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

export function EnhancedSelectInput<V>({
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  showScrollIndicators = false,
  // All remaining props are forwarded to the hook
  ...hookProps
}: Properties<V>) {
  const { selectedIndex, rotateIndex, visibleItems, hasItems, itemsAbove, itemsBelow } =
    useEnhancedSelectInput(hookProps)

  if (!hasItems) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent
  const isVertical = hookProps.orientation !== 'horizontal'

  return (
    <Box flexDirection={isVertical ? 'column' : 'row'}>
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

          return (
            <Box key={item.key ?? String(item.value)}>
              {item.indicator ? (
                <Box marginRight={1}>
                  <Text>{isSelected ? item.indicator : ' '}</Text>
                </Box>
              ) : (
                <IndicatorComponent isSelected={isSelected} item={item} />
              )}
              <ItemComponent
                isSelected={isSelected}
                label={item.label}
                isDisabled={Boolean(item.disabled)}
              />
              {item.hotkey && (
                <Text dimColor color="gray">
                  {' '}
                  ({item.hotkey})
                </Text>
              )}
            </Box>
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

export default EnhancedSelectInput
