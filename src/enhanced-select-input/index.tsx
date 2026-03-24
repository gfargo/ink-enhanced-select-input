import { Box, Text, useInput } from 'ink'
import React, { type FC, useEffect, useState } from 'react'

export type Item<V> = {
  key?: string
  label: string
  value: V
  hotkey?: string
  indicator?: React.ReactNode
  disabled?: boolean
}

type Properties<V> = {
  readonly items: Array<Item<V>>
  readonly isFocused?: boolean
  readonly initialIndex?: number
  readonly limit?: number
  readonly indicatorComponent?: FC<IndicatorProperties>
  readonly itemComponent?: FC<ItemProperties>
  readonly onSelect?: (item: Item<V>) => void
  readonly onHighlight?: (item: Item<V>) => void
  readonly orientation?: 'vertical' | 'horizontal'
}

type IndicatorProperties = {
  readonly isSelected: boolean
  // eslint-disable-next-line  react/no-unused-prop-types
  readonly item: Item<unknown>
}

type ItemProperties = {
  readonly isSelected: boolean
  readonly label: string
  readonly isDisabled: boolean
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

function DefaultItemComponent({
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
  orientation = 'vertical',
}: Properties<V>) {
  // Ensure initialIndex is within bounds and not on a disabled item
  const safeInitialIndex = (() => {
    if (items.length === 0) return 0
    const clamped = Math.min(initialIndex, items.length - 1)
    if (!items[clamped]?.disabled) return clamped
    // Search forward for the nearest enabled item, wrapping around
    for (let i = 1; i < items.length; i++) {
      const nextIndex = (clamped + i) % items.length
      if (!items[nextIndex]?.disabled) return nextIndex
    }

    return clamped
  })()
  const [selectedIndex, setSelectedIndex] = useState(safeInitialIndex)
  const [rotateIndex, setRotateIndex] = useState(
    limit ? Math.floor(safeInitialIndex / limit) * limit : 0
  )

  const visibleItems = limit
    ? items.slice(rotateIndex, rotateIndex + limit)
    : items
  const hasItems = items.length > 0

  useEffect(() => {
    if (hasItems) {
      const highlightedItem = items[selectedIndex]
      if (highlightedItem) {
        onHighlight?.(highlightedItem)
      }
    }
  }, [items, selectedIndex, onHighlight, hasItems])

  // Helper function to find next valid index
  const findNextValidIndex = (currentIndex: number, step: number): number => {
    if (!hasItems) return currentIndex

    let nextIndex = currentIndex
    const itemCount = items.length

    // Keep trying indices until we find a non-disabled item or complete a full loop
    for (let i = 0; i < itemCount; i++) {
      nextIndex = (nextIndex + step + itemCount) % itemCount
      if (!items[nextIndex]?.disabled) {
        return nextIndex
      }
    }

    // If all items are disabled, return the current index
    return currentIndex
  }

  useInput(
    (input, key) => {
      if (!isFocused || !hasItems) {
        return
      }

      let nextIndex = selectedIndex

      if (orientation === 'vertical') {
        if (key.upArrow || input === 'k') {
          nextIndex = findNextValidIndex(selectedIndex, -1)
        }

        if (key.downArrow || input === 'j') {
          nextIndex = findNextValidIndex(selectedIndex, 1)
        }
      } else {
        if (key.leftArrow || input === 'h') {
          nextIndex = findNextValidIndex(selectedIndex, -1)
        }

        if (key.rightArrow || input === 'l') {
          nextIndex = findNextValidIndex(selectedIndex, 1)
        }
      }

      if (nextIndex !== selectedIndex) {
        setSelectedIndex(nextIndex)
        if (limit) {
          setRotateIndex(Math.floor(nextIndex / limit) * limit)
        }
      }

      if (key.return) {
        const selectedItem = items[selectedIndex]
        if (selectedItem && !selectedItem.disabled) {
          onSelect?.(selectedItem)
        }
      }

      // Handle hotkey selection
      const hotkeyItem = items.find(
        (item) => item.hotkey === input && !item.disabled
      )
      if (hotkeyItem) {
        const hotkeyIndex = items.indexOf(hotkeyItem)
        setSelectedIndex(hotkeyIndex)
        if (limit) {
          setRotateIndex(Math.floor(hotkeyIndex / limit) * limit)
        }

        onSelect?.(hotkeyItem)
      }
    },
    { isActive: isFocused }
  )

  // If no items, render empty box
  if (!hasItems) {
    return <Box />
  }

  const IndicatorComponent = indicatorComponent
  const ItemComponent = itemComponent

  return (
    <Box flexDirection="column">
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
    </Box>
  )
}

export default EnhancedSelectInput
