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

export type Properties<V> = {
  readonly items: Array<Item<V>>
  readonly isFocused?: boolean
  readonly initialIndex?: number
  readonly limit?: number
  readonly indicatorComponent?: FC<IndicatorProperties>
  readonly itemComponent?: FC<ItemProperties>
  readonly onSelect?: (item: Item<V>) => void
  readonly onHighlight?: (item: Item<V>) => void
  /** Called when Escape is pressed while the component is focused. */
  readonly onCancel?: () => void
  readonly orientation?: 'vertical' | 'horizontal'
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

function resolveInitialIndex<V>(
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

function findNextValidIndex<V>(
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

function findFirstValidIndex<V>(items: Array<Item<V>>): number {
  for (let i = 0; i < items.length; i++) {
    if (!items[i]?.disabled) return i
  }

  return 0
}

function findLastValidIndex<V>(items: Array<Item<V>>): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]?.disabled) return i
  }

  return items.length - 1
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
  items,
  isFocused = true,
  initialIndex = 0,
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  limit,
  onSelect,
  onHighlight,
  onCancel,
  orientation = 'vertical',
}: Properties<V>) {
  const safeInitialIndex = resolveInitialIndex(items, initialIndex)
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex)
  const [rotateIndex, setRotateIndex] = useState(
    limit ? Math.floor(safeInitialIndex / limit) * limit : 0
  )

  const visibleItems = limit
    ? items.slice(rotateIndex, rotateIndex + limit)
    : items
  const hasItems = items.length > 0

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

      // Home / End — jump to first or last enabled item
      if (key.home) {
        updateSelection(findFirstValidIndex(items))
        return
      }

      if (key.end) {
        updateSelection(findLastValidIndex(items))
        return
      }

      // Escape — cancel / dismiss
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

  if (!hasItems) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent

  return (
    <Box
      flexDirection={orientation === 'vertical' ? 'column' : 'row'}
      gap={orientation === 'vertical' ? 0 : 2}
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
  )
}

export default EnhancedSelectInput
