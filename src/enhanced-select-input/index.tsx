import { Box, Text, useFocus, useInput, type Key } from 'ink'
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
  /**
   * Submenu items. When non-empty, Enter/→ "descends" into this list instead
   * of firing `onSelect`, and Escape/← "ascends" back to the parent list,
   * restoring the parent's highlighted index and search query. Only honored
   * in vertical, single-select mode — nesting is mutually exclusive with
   * `multiple` in v1, and is ignored entirely in horizontal orientation and
   * when `selectedIndex` (controlled highlight) is supplied. A `disabled`
   * item is never descendable, even with `children` set.
   *
   * In `searchable` mode, ←/→ are claimed by search-cursor movement instead
   * of descend/ascend, so descending is Enter-only; ascending is Escape-only,
   * and if there's a non-empty search query, the first Escape clears the
   * query rather than ascending.
   */
  children?: Array<Item<V>>
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
// eslint-disable-next-line unicorn/prevent-abbreviations
export type UseEnhancedSelectInputProps<V> = {
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
   * Called with the next search query whenever it would change — via typing,
   * backspace, word/line delete, Escape-clear, or the imperative
   * `setSearchQuery`. Only used when `searchable` is true; never fires
   * otherwise. Combine with `searchQuery` to drive remote/async filtering
   * from outside the component.
   */
  readonly onSearchChange?: (query: string) => void
  /**
   * Controls the search query from outside the component. When provided,
   * search-editing keypresses call `onSearchChange` instead of mutating the
   * query internally — the parent owns the value and must feed it back for
   * the displayed query to change. Built-in filtering is also skipped while
   * controlled (`filteredItems` is `items` verbatim) since the parent is
   * expected to supply an already-filtered `items` array. Combine with
   * `onSearchChange` for a fully controlled search — a dev warning is logged
   * if it's supplied without a handler. Only used when `searchable` is true.
   */
  readonly searchQuery?: string
  /**
   * Debounces `onSearchChange` calls by this many milliseconds — useful when
   * the parent drives an expensive/remote search off the query. The
   * displayed query (and cursor) still updates immediately; only the
   * `onSearchChange` notification is delayed/coalesced. Unset or `0` fires
   * synchronously. Intended for an uncontrolled `searchQuery` — a controlled
   * `searchQuery` already lags behind the parent's own state, so debouncing
   * the notification on top of that just adds latency; debounce on the
   * parent's side instead. Only used when `searchable` is true.
   */
  readonly searchDebounce?: number
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
 * @deprecated Renamed to {@link UseEnhancedSelectInputProps}. Kept as an
 * alias for backward compatibility; will be removed in a future minor.
 */
export type UseEnhancedSelectInputProperties<V> = UseEnhancedSelectInputProps<V>

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
// eslint-disable-next-line unicorn/prevent-abbreviations
export type EnhancedSelectInputProps<V> = UseEnhancedSelectInputProps<V> & {
  readonly indicatorComponent?: FC<IndicatorProps>
  readonly itemComponent?: FC<ItemProps>
  readonly groupHeaderComponent?: FC<GroupHeaderProps>
  /** Custom renderer for `{ type: 'separator' }` rows. */
  readonly separatorComponent?: FC<SeparatorProps>
  /** Custom renderer for the breadcrumb row shown above the list when nested. */
  readonly breadcrumbComponent?: FC<BreadcrumbProps>
  /**
   * Show a breadcrumb of the current navigation `path` above the list
   * whenever nested (`depth > 0`). No-op outside nested navigation. Default: true.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly showBreadcrumb?: boolean
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
   * Maximum display width (in characters) for an item's label. Labels longer
   * than this are ellipsized so each item stays on a single row, making
   * `limit` a trustworthy height budget. Display-only — search filtering,
   * `onSelect`/`onHighlight`/`onConfirm`, and hotkeys still use the item's
   * original `label`. Unset or `<= 0` disables truncation (default).
   */
  readonly maxWidth?: number
  /**
   * Where the ellipsis lands when a label exceeds `maxWidth`. `'end'` keeps
   * the start (`somelongla…`), `'start'` keeps the end (`…onglabelxyz`), and
   * `'middle'` keeps both ends (`some…lxyz`) — useful for file paths.
   * Only used when `maxWidth` is set. Default: `'end'`.
   */
  readonly truncate?: TruncateMode
  /**
   * Override the colors used by the default render components. Omitted
   * slots keep their default value. Automatically disabled when the
   * `NO_COLOR` environment variable is set. See {@link Theme}.
   */
  readonly theme?: Partial<Theme>
  /**
   * Render-only loading indicator, e.g. while a parent-driven async search
   * (see `onSearchChange`) is in flight. Renders a loading row beneath the
   * search input; when the current item list is empty, the loading row
   * replaces "No matches" instead of appearing alongside it. Default: false.
   */
  readonly isLoading?: boolean
  /** Text shown by the default loading row. Only used when `isLoading` is true. Default: `'Searching…'`. */
  readonly loadingText?: string
  /** Custom renderer for the loading row. Only used when `isLoading` is true. */
  readonly loadingComponent?: FC<LoadingProperties>
  /**
   * Render a dim footer line listing the currently-active keybindings (e.g.
   * `↑↓ navigate · enter select · esc cancel`), derived from `keyMap`,
   * `multiple`, `searchable`, and `orientation` so it can never drift from
   * actual behaviour. Default: false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly showHelp?: boolean
  /**
   * Opt into Ink's focus manager instead of relying solely on the manual
   * `isFocused` prop. When true, effective focus is derived from Ink's
   * `useFocus` (so Tab can cycle between several focusable selects on one
   * screen); `isFocused={false}` still force-disables input and drops the
   * component out of the Tab ring. Treat as a static/config-time prop.
   * Default: false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly focusable?: boolean
  /**
   * Focus this component on mount when nothing else is focused yet. Only
   * meaningful when `focusable` is true. Default: false.
   */
  // eslint-disable-next-line react/boolean-prop-naming
  readonly autoFocus?: boolean
  /**
   * Stable id for Ink's focus manager, letting a parent programmatically
   * focus this component via `useFocusManager().focus(id)`. Only meaningful
   * when `focusable` is true.
   */
  readonly focusId?: string
}

export type LoadingProperties = {
  readonly loadingText: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

/**
 * @deprecated Renamed to {@link EnhancedSelectInputProps}. Kept as an alias
 * for backward compatibility; will be removed in a future minor.
 */
export type Properties<V> = EnhancedSelectInputProps<V>

// eslint-disable-next-line unicorn/prevent-abbreviations
export type IndicatorProps = {
  readonly isSelected: boolean
  /** True when the item is checked in multi-select mode. Undefined in single-select mode. */
  readonly isChecked?: boolean
  /**
   * The item being rendered. Pass-through for custom indicator components
   * that want to key their rendering off item data (e.g. `item.value`); the
   * default renderer doesn't read it.
   */
  // eslint-disable-next-line react/no-unused-prop-types
  readonly item: Item<unknown>
  /** Glyph shown when `isChecked` is true. Falls back to `'[x]'`. */
  readonly checkedIndicator?: string
  /** Glyph shown when `isChecked` is false. Falls back to `'[ ]'`. */
  readonly uncheckedIndicator?: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

/**
 * @deprecated Renamed to {@link IndicatorProps}. Kept as an alias for
 * backward compatibility; will be removed in a future minor.
 */
export type IndicatorProperties = IndicatorProps

// eslint-disable-next-line unicorn/prevent-abbreviations
export type ItemProps = {
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

/**
 * @deprecated Renamed to {@link ItemProps}. Kept as an alias for backward
 * compatibility; will be removed in a future minor.
 */
export type ItemProperties = ItemProps

// eslint-disable-next-line unicorn/prevent-abbreviations
export type GroupHeaderProps = {
  readonly label: string
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

/**
 * @deprecated Renamed to {@link GroupHeaderProps}. Kept as an alias for
 * backward compatibility; will be removed in a future minor.
 */
export type GroupHeaderProperties = GroupHeaderProps

// eslint-disable-next-line unicorn/prevent-abbreviations
export type BreadcrumbProps = {
  /**
   * The chain of parent items descended into to reach the current level,
   * root-to-leaf. Only rendered when non-empty (`depth > 0`).
   */
  readonly path: Array<Item<unknown>>
  /** Resolved theme colors, present when rendered by EnhancedSelectInput. */
  readonly theme?: ResolvedTheme
}

/**
 * @deprecated Renamed to {@link BreadcrumbProps}. Kept as an alias for
 * backward compatibility; will be removed in a future minor.
 */
export type BreadcrumbProperties = BreadcrumbProps

// eslint-disable-next-line unicorn/prevent-abbreviations
export type SeparatorProps = Record<string, unknown>

/**
 * @deprecated Renamed to {@link SeparatorProps}. Kept as an alias for
 * backward compatibility; will be removed in a future minor.
 */
export type SeparatorProperties = SeparatorProps

// Vim navigation keys that take precedence over hotkeys.
// An item hotkey that matches one of these values will never fire in the
// corresponding orientation — document this constraint at the call site.
const NAV_CONFIG = {
  vertical: {
    backwardArrow: 'upArrow',
    forwardArrow: 'downArrow',
    backwardVimKey: 'k',
    forwardVimKey: 'j',
  },
  horizontal: {
    backwardArrow: 'leftArrow',
    forwardArrow: 'rightArrow',
    backwardVimKey: 'h',
    forwardVimKey: 'l',
  },
} as const satisfies Record<
  'vertical' | 'horizontal',
  {
    backwardArrow: keyof Key
    forwardArrow: keyof Key
    backwardVimKey: string
    forwardVimKey: string
  }
>

const NAV_VIM_KEYS: Record<'vertical' | 'horizontal', Set<string>> = {
  vertical: new Set([
    NAV_CONFIG.vertical.backwardVimKey,
    NAV_CONFIG.vertical.forwardVimKey,
  ]),
  horizontal: new Set([
    NAV_CONFIG.horizontal.backwardVimKey,
    NAV_CONFIG.horizontal.forwardVimKey,
  ]),
}

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

/** Where the ellipsis lands when a label exceeds `maxWidth`. */
export type TruncateMode = 'end' | 'middle' | 'start'

/**
 * Ellipsizes `label` down to exactly `maxWidth` characters when it exceeds
 * that width; shorter labels are returned unchanged. Character-length based
 * (UTF-16 code units), not terminal-column aware — fine for ASCII/file-path
 * labels, but wide/CJK/emoji labels won't be column-perfect.
 */
export function truncateLabel(
  label: string,
  maxWidth: number,
  mode: TruncateMode = 'end'
): string {
  if (!maxWidth || maxWidth <= 0 || label.length <= maxWidth) return label

  const ellipsis = '…'
  if (maxWidth === 1) return ellipsis

  const room = maxWidth - 1
  if (mode === 'start') return ellipsis + label.slice(label.length - room)

  if (mode === 'middle') {
    const left = Math.ceil(room / 2)
    const right = room - left
    return (
      label.slice(0, left) +
      ellipsis +
      (right > 0 ? label.slice(label.length - right) : '')
    )
  }

  return label.slice(0, room) + ellipsis
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
      for (let i = searchFrom; i < normalizedText.length;) {
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
export type ResolvedKeyMap = Required<KeyMap>

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
  filteredItems: Array<ItemOrSeparator<V>>
  /** Current depth in the nested-item level stack. 0 at the root. */
  depth: number
  /**
   * Whether descend/ascend intents may be resolved at all — false when
   * `multiple` or the highlighted index is controlled (nesting is
   * unsupported in both, see {@link Item.children}).
   */
  nestingEnabled: boolean
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
  | { type: 'descend'; item: Item<V> }
  | { type: 'ascend' }

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

  // Ink's terminal parser cannot tell the physical Backspace key apart from
  // the physical (forward-)Delete key here: most terminals send \x7F for
  // Backspace, and xterm-style terminals send the CSI "\x1B[3~" sequence for
  // Delete — Ink maps *both* to `key.delete` (only literal `\b`/Ctrl+H sets
  // `key.backspace`), with no other field on the public `Key` type to
  // disambiguate them. So both keys intentionally perform the same
  // delete-before-cursor edit; there is no way to give forward-Delete a
  // distinct "delete character after cursor" behavior without reading raw
  // stdin bytes ourselves. See https://github.com/vadimdemedes/ink/blob/main/src/parse-keypress.ts.
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
  const { backwardArrow, forwardArrow, backwardVimKey, forwardVimKey } =
    NAV_CONFIG[orientation]

  if (
    (km.arrows && key[backwardArrow]) ||
    (km.vimKeys && !searchable && !isModifiedChord && input === backwardVimKey)
  ) {
    return -1
  }

  if (
    (km.arrows && key[forwardArrow]) ||
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
export function resolveKeyMap(keyMap: KeyMap | undefined): ResolvedKeyMap {
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
  const isActiveVimKey =
    km.vimKeys &&
    !searchable &&
    !isModifiedChord &&
    NAV_VIM_KEYS[orientation].has(input)
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
 * True for keys Ink reports with a non-empty `input` string even though
 * they aren't real search text — notably Return, which sends `\r`. Earlier
 * handlers (submit, jump, page, navigate, cancel) only intercept these when
 * their corresponding `keyMap` flag is enabled, so a disabled flag (e.g.
 * `keyMap.select: false`) must not let the key fall through to search
 * capture instead — it must be excluded here unconditionally.
 */
function isNonPrintableKey(key: Key): boolean {
  return (
    key.return ||
    key.tab ||
    key.escape ||
    key.upArrow ||
    key.downArrow ||
    key.leftArrow ||
    key.rightArrow ||
    key.pageUp ||
    key.pageDown ||
    key.home ||
    key.end ||
    key.backspace ||
    key.delete
  )
}

/**
 * Printable characters captured as search input in searchable mode. Must be
 * resolved after navigation-key handling.
 */
function resolveSearchAppendIntent<V>(
  input: string,
  key: Key,
  context: InputIntentContext<V>,
  isModifiedChord: boolean
): Intent<V> | undefined {
  return context.searchable &&
    context.km.search &&
    input &&
    !isModifiedChord &&
    !isNonPrintableKey(key)
    ? { type: 'search-append', char: input }
    : undefined
}

/**
 * Ascend out of a nested item list back to its parent, vertical orientation
 * only. Resolved between search-editing (which already claims a non-empty
 * query's Escape, and a searchable list's ← for cursor movement) and the
 * plain cancel branch below — so at depth 0 this always falls through to
 * `cancel` → `onCancel`, matching pre-nesting behavior exactly.
 */
function resolveAscendIntent<V>(
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { km, orientation, depth, nestingEnabled } = context
  if (!nestingEnabled || orientation !== 'vertical' || depth === 0) {
    return undefined
  }

  if ((km.cancel && key.escape) || (km.arrows && key.leftArrow)) {
    return { type: 'ascend' }
  }

  return undefined
}

/**
 * Descend into the highlighted item's `children`, vertical orientation only.
 * Resolved just before `submit` so a parent item (non-empty `children`)
 * never reaches `submit` and never fires `onSelect` — only a leaf Enter
 * does. `isSelectable` already excludes disabled/separator entries, so a
 * disabled parent is never descendable.
 */
function resolveDescendIntent<V>(
  key: Key,
  context: InputIntentContext<V>
): Intent<V> | undefined {
  const { km, orientation, filteredItems, selectedIndex, nestingEnabled } =
    context
  if (!nestingEnabled || orientation !== 'vertical') return undefined
  if (!((km.select && key.return) || (km.arrows && key.rightArrow))) {
    return undefined
  }

  const highlighted = filteredItems[selectedIndex]
  if (!isSelectable(highlighted) || !highlighted.children?.length) {
    return undefined
  }

  return { type: 'descend', item: highlighted }
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

  const ascend = resolveAscendIntent(key, context)
  if (ascend) return ascend

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

  const descend = resolveDescendIntent(key, context)
  if (descend) return descend

  if (km.select && key.return) {
    return { type: 'submit' }
  }

  const searchAppend = resolveSearchAppendIntent(
    input,
    key,
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
  visibleItems: Array<ItemOrSeparator<V>>
  /** True when filtered items is non-empty. */
  hasItems: boolean
  /** Number of items hidden above the current window. */
  itemsAbove: number
  /** Number of items hidden below the current window. */
  itemsBelow: number
  /** Keys of checked items. Only populated in multi-select mode. */
  checkedKeys: Set<string>
  /**
   * Current search query. Empty string when searchable is false or no input
   * yet. Mirrors the `searchQuery` prop verbatim when it's controlled.
   */
  searchQuery: string
  /**
   * Cursor position within `searchQuery`, clamped to `[0, searchQuery.length]`.
   * 0 when searchable is false or no input has been entered yet.
   */
  searchCursor: number
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
   * The chain of parent items descended into to reach the current level,
   * root-to-leaf. Empty at the root (`depth === 0`). See {@link Item.children}.
   */
  path: Array<Item<V>>
  /** Current nesting depth — 0 at the root, incrementing on each descend. */
  depth: number
  /**
   * Imperatively move the highlighted item to `index` (clamped into range,
   * resolved to the nearest enabled item). Keeps the pagination window in sync.
   */
  setSelectedIndex: (index: number) => void
  /**
   * Imperatively set the search query, resetting the highlighted selection
   * back to the top. No-op filtering effect unless `searchable` is true. In
   * controlled `searchQuery` mode, this only calls `onSearchChange` — the
   * parent must feed the value back for the displayed query to change.
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
 * One frame of the nested-navigation level stack. The root frame (index 0)
 * has no `parent` and its `items`/`selectedIndex`/`rotateIndex` are derived
 * live from the hook's own props/state rather than read from this frame —
 * see `activeItems` in {@link useEnhancedSelectInput}. Frames pushed by a
 * descend snapshot the parent item's `children` and carry cursor/scroll
 * memory (`selectedIndex`/`rotateIndex`) so ascending restores exactly where
 * the user left off.
 */
type Level<V> = {
  parent?: Item<V>
  items: Array<ItemOrSeparator<V>>
  selectedIndex: number
  rotateIndex: number
}

/** Options bag for {@link computeFilteredItems} — see its parameters for details. */
type FilterOptions<V> = {
  searchable: boolean
  isQueryControlled: boolean
  searchQuery: string
  filter: ((item: Item<V>, query: string) => boolean) | undefined
  searchFields: ((item: Item<V>) => string | string[]) | undefined
  matchMode: MatchMode
}

/**
 * Pure search-filter step shared by the `filteredItems` memo and the initial
 * `stack` state (which needs a filtered result before `filteredItems` itself
 * exists, to resolve the root's initial highlighted index).
 */
function computeFilteredItems<V>(
  items: Array<ItemOrSeparator<V>>,
  options: FilterOptions<V>
): Array<ItemOrSeparator<V>> {
  const {
    searchable,
    isQueryControlled,
    searchQuery,
    filter,
    searchFields,
    matchMode,
  } = options
  if (!searchable || isQueryControlled || !searchQuery) return items
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
  onSearchChange,
  searchQuery: controlledQuery,
  searchDebounce,
  keyMap,
  typeahead = false,
  typeaheadTimeout = 500,
  loop = true,
}: UseEnhancedSelectInputProps<V>): UseEnhancedSelectInputResult<V> {
  const km = resolveKeyMap(keyMap)
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [searchCursor, setSearchCursor] = useState(0)
  const isQueryControlled = controlledQuery !== undefined
  const searchQuery = isQueryControlled ? controlledQuery : internalSearchQuery

  // Mirror searchQuery/searchCursor synchronously so the useInput handler can
  // read-and-update both together within a single keypress, and so a burst of
  // keypresses delivered in one synchronous tick (e.g. a fast paste) chains
  // correctly — React coalesces same-tick setState calls, so a later call in
  // the same burst would otherwise still see this render's (stale) query and
  // cursor rather than the previous call's result. Resynced at the top of
  // every render so external updates (e.g. setSearchQueryPublic, or the
  // parent feeding back a controlled `searchQuery`) stay authoritative.
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

  // Same pattern for onSearchChange — read from a ref so notifySearchChange
  // (and its debounce timer closure) always calls the latest callback
  // without needing it as an effect/callback dependency.
  const onSearchChangeReference = useRef(onSearchChange)
  onSearchChangeReference.current = onSearchChange
  const debounceTimerReference = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)

  // Fires onSearchChange, coalescing rapid calls into one when searchDebounce
  // is set. Only the notification is delayed — the displayed query/cursor
  // above always updates synchronously with the keypress.
  const notifySearchChange = (query: string) => {
    if (!searchDebounce) {
      onSearchChangeReference.current?.(query)
      return
    }

    if (debounceTimerReference.current !== undefined) {
      clearTimeout(debounceTimerReference.current)
    }

    debounceTimerReference.current = setTimeout(() => {
      debounceTimerReference.current = undefined
      onSearchChangeReference.current?.(query)
    }, searchDebounce)
  }

  useEffect(() => {
    return () => {
      if (debounceTimerReference.current !== undefined) {
        clearTimeout(debounceTimerReference.current)
      }
    }
  }, [])

  // Level stack for nested navigation (see Item.children). The root frame
  // (index 0) is a placeholder — its items/selectedIndex are never read from
  // the frame itself; the root instead reads live from the `items` prop and
  // this frame's `selectedIndex`/`rotateIndex` slots (see `activeItems`
  // below), so the root keeps behaving exactly like the pre-nesting
  // single-level hook, including reacting to `items` prop churn. Frames at
  // index >= 1 are pushed by descend and hold a snapshot of the parent
  // item's `children` plus cursor/scroll memory for ascend to restore.
  const [stack, setStack] = useState<Array<Level<V>>>(() => [
    {
      items,
      selectedIndex: resolveInitialSelection(
        computeFilteredItems(items, {
          searchable,
          isQueryControlled,
          searchQuery,
          filter,
          searchFields,
          matchMode,
        }),
        {
          initialKey,
          initialValue,
          initialIndex: rawInitialIndex,
          autoSelectFirstEnabled,
        }
      ),
      rotateIndex: 0,
    },
  ])
  const depth = stack.length - 1
  const topFrame = stack[depth]!
  // Depth 0 always reads the live `items` prop (not the frame's snapshot) so
  // async/parent-driven updates to `items` keep flowing in exactly as they
  // did before nesting existed; only a descended level uses its snapshot.
  const activeItems = depth === 0 ? items : topFrame.items

  // Updates the top-of-stack frame's selectedIndex immutably — the
  // uncontrolled-mode counterpart of the pre-nesting flat `setUncontrolledIndex`.
  const setTopSelectedIndex = (index: number) => {
    setStack((previous) => {
      const next = [...previous]
      next[next.length - 1] = { ...next.at(-1)!, selectedIndex: index }
      return next
    })
  }

  // Filter items based on search query. Memoized so the reference is stable
  // across renders that don't actually change the item set — downstream
  // effects depend on this reference to distinguish "items changed" from
  // "parent re-rendered with a new-but-equivalent array". Skipped entirely
  // while `searchQuery` is controlled — the parent is expected to pass an
  // already-filtered `items` array, so filtering here would double-filter.
  const filteredItems = useMemo<Array<ItemOrSeparator<V>>>(
    () =>
      computeFilteredItems(activeItems, {
        searchable,
        isQueryControlled,
        searchQuery,
        filter,
        searchFields,
        matchMode,
      }),
    [
      activeItems,
      searchable,
      isQueryControlled,
      searchQuery,
      filter,
      matchMode,
      searchFields,
    ]
  )

  // Pagination windows ("pages") are computed against rendered row count —
  // items plus the group headers injected before them — not raw item count,
  // so `limit` bounds what actually appears on screen.
  const pageStarts = useMemo(
    () => (limit ? computePageStarts(filteredItems, limit) : []),
    [filteredItems, limit]
  )

  const isIndexControlled = controlledIndex !== undefined
  // Nesting is unsupported alongside `multiple` (checkedKeys stays a single
  // flat set over the root `items`, see Item.children) or a controlled
  // highlight (the level stack governs the uncontrolled cursor only).
  const nestingEnabled = !multiple && !isIndexControlled
  const selectedIndex = isIndexControlled
    ? resolveInitialIndex(filteredItems, controlledIndex)
    : topFrame.selectedIndex
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
  // Shared by both the controlled and uncontrolled pruning below so a single
  // pass over `items` serves both paths.
  const itemKeySets = useMemo(() => {
    const disabledKeys = new Set<string>()
    const validKeys = new Set<string>()
    const duplicateKeys = new Set<string>()
    for (const item of items) {
      if (isSeparator(item)) continue
      const k = itemKey(item)
      if (validKeys.has(k)) duplicateKeys.add(k)
      validKeys.add(k)
      if (item.disabled) disabledKeys.add(k)
    }

    const duplicateSignature =
      duplicateKeys.size > 0 ? [...duplicateKeys].sort().join(', ') : undefined

    return { validKeys, disabledKeys, duplicateSignature }
  }, [items])
  const controlledCheckedKeys = useMemo(() => {
    if (!isKeysControlled) return undefined
    // Drop keys for items that no longer exist in `items` at all — not just
    // ones that became disabled — otherwise a checked item removed from
    // `items` (e.g. a remote search results page being replaced) leaves a
    // phantom key behind, and a later `items` array that happens to reuse
    // the same key would render pre-checked despite the user never checking
    // it this time.
    return new Set(
      controlledKeys.filter(
        (key) =>
          itemKeySets.validKeys.has(key) && !itemKeySets.disabledKeys.has(key)
      )
    )
  }, [isKeysControlled, controlledKeys, itemKeySets])
  // Uncontrolled counterpart of the pruning above, computed synchronously
  // (mirroring `controlledCheckedKeys`) rather than via a `useEffect` —
  // otherwise a same-tick `items` change followed by Enter would read
  // `checkedKeysReference.current` before the effect flushed the prune,
  // letting a phantom key still count toward `handleSubmit`'s min/max gate
  // (B18). Returns `uncontrolledCheckedKeys` unchanged (same reference) when
  // nothing needs pruning, so the persistence effect below is a no-op.
  const prunedUncontrolledCheckedKeys = useMemo(() => {
    if (isKeysControlled) return uncontrolledCheckedKeys
    let changed = false
    const next = new Set<string>()
    for (const key of uncontrolledCheckedKeys) {
      if (itemKeySets.validKeys.has(key)) {
        next.add(key)
      } else {
        changed = true
      }
    }

    return changed ? next : uncontrolledCheckedKeys
  }, [isKeysControlled, uncontrolledCheckedKeys, itemKeySets])
  const checkedKeys = controlledCheckedKeys ?? prunedUncontrolledCheckedKeys
  // Mirrors `checkedKeys` synchronously so the Enter branch below can read
  // the committed set even when a Space toggle and Enter are written in the
  // same tick (no intervening render to flush the `checkedKeys` state).
  const checkedKeysReference = useRef(checkedKeys)
  checkedKeysReference.current = checkedKeys
  // Caches the full Item for every currently-checked key, keyed by itemKey.
  // `items` can churn entirely (e.g. a parent-driven async search replacing
  // the result set — see onSearchChange/isLoading) while a key stays
  // checked; without this, onConfirm's `confirmScope: 'all'` lookup below
  // would silently drop a checked item once it's no longer present in
  // `items` to look up. Backfilled from `items` below. Eviction is split in
  // two: `updateCheckedKeys` (the toggle/selectAll/selectNone/invertSelection
  // choke point) drops any key it no longer includes, covering explicit
  // uncheck even for an item that has already churned out of `items`; the
  // effect below additionally evicts a key that became unchecked via some
  // other path (e.g. a controlled `selectedKeys` prop update, or the item
  // going disabled) while its item is still present in `items`.
  const checkedItemsCacheReference = useRef<Map<string, Item<V>>>(new Map())
  useEffect(() => {
    const cache = checkedItemsCacheReference.current
    for (const item of items) {
      if (isSeparator(item)) continue
      const k = itemKey(item)
      if (checkedKeys.has(k)) cache.set(k, item)
    }

    for (const k of cache.keys()) {
      if (itemKeySets.validKeys.has(k) && !checkedKeys.has(k)) cache.delete(k)
    }
  }, [items, checkedKeys, itemKeySets])
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
  // became disabled, or was removed from `items` entirely, and is now
  // filtered out of `controlledCheckedKeys` above. Without this the parent's
  // own copy of the keys would silently include a key that no longer renders
  // as checked.
  useEffect(() => {
    if (!isKeysControlled || !controlledCheckedKeys) return
    if (controlledCheckedKeys.size !== controlledKeys.length) {
      onSelectedKeysChangeReference.current?.([...controlledCheckedKeys])
    }
  }, [isKeysControlled, controlledCheckedKeys, controlledKeys])

  // Persists the synchronously-pruned set (above) back into
  // `uncontrolledCheckedKeys` state so it's what future renders start from.
  // `prunedUncontrolledCheckedKeys` already equals `checkedKeys` this render
  // — via `checkedKeysReference` — so this effect is bookkeeping, not the
  // thing closing the same-tick gap.
  useEffect(() => {
    if (isKeysControlled) return
    if (prunedUncontrolledCheckedKeys !== uncontrolledCheckedKeys) {
      setUncontrolledCheckedKeys(prunedUncontrolledCheckedKeys)
    }
  }, [isKeysControlled, prunedUncontrolledCheckedKeys, uncontrolledCheckedKeys])

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
  // String(value) to produce "[object Object]" for every item. Duplicate
  // detection itself piggybacks on the `itemKeySets` pass above (which
  // already scans every item for pruning), so no separate O(n) scan runs
  // here. `duplicateSignature` is a primitive that stays value-stable across
  // re-renders with an equivalent but new `items` reference — e.g. an inline
  // array literal from the caller — so this effect only re-fires when the
  // actual duplicate set changes, not on every render.
  // A descended level scans its own `children` for duplicates too — the
  // `itemKeySets` pass above only covers the root `items` prop, so a
  // submenu's duplicate keys would otherwise go undetected. At depth 0
  // `activeItems === items`, so this just reuses `itemKeySets`'s signature
  // rather than re-scanning; only depth >= 1 pays for a second pass.
  const activeDuplicateSignature = useMemo(() => {
    if (depth === 0) return itemKeySets.duplicateSignature

    const seenKeys = new Set<string>()
    const duplicateKeys = new Set<string>()
    for (const item of activeItems) {
      if (isSeparator(item)) continue
      const k = itemKey(item)
      if (seenKeys.has(k)) duplicateKeys.add(k)
      seenKeys.add(k)
    }

    return duplicateKeys.size > 0
      ? [...duplicateKeys].sort().join(', ')
      : undefined
  }, [depth, activeItems, itemKeySets.duplicateSignature])
  useEffect(() => {
    if (activeDuplicateSignature === undefined) return
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return

    console.warn(
      `[ink-enhanced-select-input] Duplicate item keys detected: ${activeDuplicateSignature}. ` +
        'Set a unique "key" on each item — this is required when value is a non-primitive type (e.g. object).'
    )
  }, [activeDuplicateSignature])

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
      setTopSelectedIndex(0)
      return
    }

    const currentItem = filteredItems[selectedIndexReference.current]
    if (!isSelectable(currentItem)) {
      const newIndex = resolveInitialIndex(
        filteredItems,
        selectedIndexReference.current
      )
      setTopSelectedIndex(newIndex)
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

  // Warn in development when `children` is combined with horizontal
  // orientation — nesting (descend/ascend) is only wired up for `←/→` and
  // Enter/Escape in vertical orientation (see `resolveDescendIntent`/
  // `resolveAscendIntent`), so a submenu on a horizontal item is silently
  // unreachable. Depend on this derived boolean (not `items`) so the warning
  // doesn't re-fire on every parent re-render that passes a new-but-equivalent
  // items array.
  const hasIgnoredChildren =
    orientation === 'horizontal' &&
    items.some((item) => !isSeparator(item) && Boolean(item.children?.length))

  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (!hasIgnoredChildren) return
    console.warn(
      '[ink-enhanced-select-input] item.children is ignored in horizontal orientation — ' +
        'nested navigation (descend/ascend) is only supported in vertical orientation.'
    )
  }, [hasIgnoredChildren])

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

  useEffect(() => {
    // eslint-disable-next-line n/prefer-global/process
    if (process.env['NODE_ENV'] === 'production') return
    if (isQueryControlled && onSearchChange === undefined) {
      console.warn(
        '[ink-enhanced-select-input] searchQuery was provided without onSearchChange — ' +
          'the query will not respond to typing. Pass onSearchChange to update it.'
      )
    }
  }, [isQueryControlled, onSearchChange])

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
    if (!isIndexControlled) setTopSelectedIndex(nextIndex)
  }

  // Commits the next checked-keys set. In controlled mode, only notifies the
  // parent via `onSelectedKeysChange` — the parent must feed the value back
  // through `selectedKeys` for the checked set to actually change. In
  // uncontrolled mode, updates internal state directly.
  const updateCheckedKeys = (next: Set<string>) => {
    checkedKeysReference.current = next
    // Cache newly-checked items synchronously (not just via the effect
    // above) so a same-tick check-then-Enter reads a warm cache — see
    // checkedItemsCacheReference.
    for (const item of filteredItems) {
      if (isSeparator(item)) continue
      const k = itemKey(item)
      if (next.has(k)) checkedItemsCacheReference.current.set(k, item)
    }

    // `next` is the new source of truth for "what's checked" — drop any
    // cache entry it no longer includes, even for a key whose item has
    // already churned out of `items` entirely. Without this, selectNone()/
    // invertSelection()/an explicit uncheck can't ever clear a cache entry
    // for a churned-out item (the eviction effect above requires the item
    // to still be present in `items` to evict it), so a key the user just
    // cleared could resurface in the confirmScope: 'all' fallback anyway.
    for (const k of checkedItemsCacheReference.current.keys()) {
      if (!next.has(k)) checkedItemsCacheReference.current.delete(k)
    }

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

  // Clears the search query on descend/ascend — search is per-level, so a
  // query typed in one list must not carry into (or back out of) another.
  // Mirrors the `search-clear` intent's query/cursor reset, but skips
  // `resetSelectionToTopUnlessUnselected` since the caller already sets the
  // new level's selectedIndex explicitly.
  const resetSearchForLevelChange = () => {
    const previousQuery = searchQueryReference.current
    searchQueryReference.current = ''
    searchCursorReference.current = 0
    if (!isQueryControlled) setInternalSearchQuery('')
    setSearchCursor(0)
    if (previousQuery !== '') notifySearchChange('')
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
    const previousQuery = searchQueryReference.current
    searchQueryReference.current = query
    searchCursorReference.current = query.length
    if (!isQueryControlled) setInternalSearchQuery(query)
    setSearchCursor(query.length)
    if (searchable && query !== previousQuery) notifySearchChange(query)
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

      if (confirmScope === 'all') {
        // A checked key can survive result churn (e.g. async search replaced
        // `items` entirely — B18) with no matching item left in `items` to
        // filter from above — `checkedKeysReference` itself is pruned of
        // such keys (they'd otherwise count toward min/max selection). The
        // cache is the only remaining record of them, so it — not
        // `checkedKeysReference` — is what's iterated here to still include
        // them in the confirmed set.
        const confirmedKeys = new Set(confirmed.map((item) => itemKey(item)))
        for (const [k, cached] of checkedItemsCacheReference.current) {
          if (!confirmedKeys.has(k)) confirmed.push(cached)
        }
      }

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
      // Terminals that negotiate the Kitty keyboard protocol (Kitty, Ghostty,
      // WezTerm, ...) report `key.eventType: 'press' | 'repeat' | 'release'`
      // for every keystroke; terminals that don't leave it `undefined`. A
      // 'release' event is the same physical keystroke Ink already handled
      // on 'press' — acting on it too would double-navigate/double-toggle,
      // so it's dropped unconditionally. 'repeat' (a held key) is allowed
      // through for navigation and for search editing, mirroring how
      // holding a key already free-scrolls or auto-repeats-types on
      // non-Kitty terminals; other one-shot intents (toggle, submit,
      // hotkeys, select-all/none, cancel, ...) ignore repeats so a held
      // Enter or Space doesn't re-fire its side effect.
      if (key.eventType === 'release') return

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
        depth,
        nestingEnabled,
        typeahead,
        typeaheadActive: typeaheadIsActive,
        loop,
        pageSize,
      })

      if (
        key.eventType === 'repeat' &&
        intent.type !== 'navigate' &&
        intent.type !== 'jump' &&
        !isSearchEditIntent(intent)
      ) {
        return
      }

      if (isSearchEditIntent(intent)) {
        const previousQuery = searchQueryReference.current
        const edit = computeSearchEdit(
          intent,
          previousQuery,
          searchCursorReference.current
        )
        searchQueryReference.current = edit.query
        searchCursorReference.current = edit.cursor
        if (!isQueryControlled) setInternalSearchQuery(edit.query)
        setSearchCursor(edit.cursor)
        if (edit.query !== previousQuery) notifySearchChange(edit.query)
        if (edit.resetSelection) resetSelectionToTopUnlessUnselected()
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

        case 'descend': {
          const children = intent.item.children!
          setStack((previous) => {
            const currentTop = previous.at(-1)!
            const updatedCurrentTop: Level<V> = {
              ...currentTop,
              rotateIndex: windowStartReference.current,
            }
            const childFrame: Level<V> = {
              parent: intent.item,
              items: children,
              selectedIndex: resolveInitialSelection(children, {
                autoSelectFirstEnabled: true,
              }),
              rotateIndex: 0,
            }
            return [...previous.slice(0, -1), updatedCurrentTop, childFrame]
          })
          windowStartReference.current = 0
          resetSearchForLevelChange()
          break
        }

        case 'ascend': {
          if (stack.length > 1) {
            const parentFrame = stack.at(-2)!
            windowStartReference.current = parentFrame.rotateIndex
            setStack((previous) => previous.slice(0, -1))
            resetSearchForLevelChange()
          }

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
    path: stack.slice(1).map((frame) => frame.parent!),
    depth,
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
}: IndicatorProps) {
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
}: ItemProps) {
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
}: GroupHeaderProps) {
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

export function DefaultBreadcrumbComponent({ path, theme }: BreadcrumbProps) {
  const resolvedTheme = theme ?? resolveTheme()
  return (
    <Box>
      <Text
        color={resolvedTheme.groupHeader}
        dimColor={resolvedTheme.dim}
        wrap="truncate-end"
      >
        {path.map((item) => item.label).join(' › ')}
      </Text>
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

export function DefaultLoadingComponent({
  loadingText,
  theme,
}: LoadingProperties) {
  const resolvedTheme = theme ?? resolveTheme()
  return (
    <Box>
      <Text dimColor={resolvedTheme.dim}>{`⠋ ${loadingText}`}</Text>
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

/**
 * Builds the ordered list of active-keybinding segments for the `showHelp`
 * footer, e.g. `['↑↓ navigate', 'enter select', 'esc cancel']`. Derived
 * entirely from the resolved key map plus `multiple`/`searchable`/
 * `isVertical` so the hint can never drift from actual behaviour.
 * `homeEnd`/`pageKeys`/`bulk`/`hotkeys` are intentionally omitted to keep
 * the line short.
 */
export function buildHelpSegments(
  km: ResolvedKeyMap,
  options: { multiple: boolean; searchable: boolean; isVertical: boolean }
): string[] {
  const { multiple, searchable, isVertical } = options
  const segments: string[] = []

  if (km.arrows || km.vimKeys) {
    segments.push(isVertical ? '↑↓ navigate' : '←→ navigate')
  }

  if (searchable && km.search) {
    segments.push('type to search')
  }

  if (multiple && km.toggle) {
    segments.push('space toggle')
  }

  if (km.select) {
    segments.push(multiple ? 'enter confirm' : 'enter select')
  }

  if (km.cancel) {
    segments.push('esc cancel')
  }

  return segments
}

/** The auto-generated keybinding help/footer line, or `null` when hidden or empty. */
function resolveHelpLine(
  show: boolean,
  km: ResolvedKeyMap,
  options: {
    multiple: boolean
    searchable: boolean
    isVertical: boolean
    theme: ResolvedTheme
  }
): React.ReactNode {
  if (!show) return null
  const segments = buildHelpSegments(km, options)
  if (segments.length === 0) return null
  return (
    <Box>
      <Text dimColor={options.theme.dim}>{segments.join(' · ')}</Text>
    </Box>
  )
}

export function EnhancedSelectInput<V>({
  indicatorComponent = DefaultIndicatorComponent,
  itemComponent = DefaultItemComponent,
  groupHeaderComponent = DefaultGroupHeaderComponent,
  separatorComponent = DefaultSeparatorComponent,
  breadcrumbComponent = DefaultBreadcrumbComponent,
  showBreadcrumb = true,
  showScrollIndicators = false,
  searchPlaceholder = 'Search...',
  maxWidth,
  truncate = 'end',
  checkedIndicator = '[x]',
  uncheckedIndicator = '[ ]',
  showSelectionCount = false,
  theme,
  isLoading = false,
  loadingText = 'Searching…',
  loadingComponent = DefaultLoadingComponent,
  showHelp = false,
  isFocused,
  focusable = false,
  autoFocus = false,
  focusId,
  // All remaining props are forwarded to the hook
  ...hookProperties
}: EnhancedSelectInputProps<V>) {
  const { isFocused: managedIsFocused } = useFocus({
    id: focusId,
    autoFocus,
    isActive: focusable ? isFocused !== false : false,
  })
  const manualIsFocused = isFocused ?? true
  const effectiveIsFocused = focusable ? managedIsFocused : manualIsFocused

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
    path,
    depth,
  } = useEnhancedSelectInput({
    ...hookProperties,
    isFocused: effectiveIsFocused,
  })

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
  const BreadcrumbComponent = breadcrumbComponent
  // A custom itemComponent receives description/hint/disabledReason as props
  // specifically so it can render them itself. Rendering them again here
  // would duplicate that text, so the parent only renders them for the
  // built-in default, which ignores those props.
  const isDefaultItemComponent = itemComponent === DefaultItemComponent
  const isVertical = hookProperties.orientation !== 'horizontal'
  const isMultiple = hookProperties.multiple === true

  const breadcrumb =
    showBreadcrumb && depth > 0 ? (
      <BreadcrumbComponent path={path} theme={resolvedTheme} />
    ) : null

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

  const km = resolveKeyMap(hookProperties.keyMap)
  const helpLine = resolveHelpLine(showHelp, km, {
    multiple: isMultiple,
    searchable,
    isVertical,
    theme: resolvedTheme,
  })

  const LoadingComponent = loadingComponent
  const loadingRow = isLoading ? (
    <LoadingComponent loadingText={loadingText} theme={resolvedTheme} />
  ) : null

  if (!hasItems) {
    // Searchable mode with no matching results — while a search is loading,
    // the loading row replaces "No matches" rather than appearing above it.
    return (
      <Box flexDirection="column">
        {breadcrumb}
        {searchInput}
        {selectionCountLine}
        {loadingRow}
        {!isLoading && (
          <Box>
            <Text dimColor={resolvedTheme.dim}>No matches</Text>
          </Box>
        )}
        {helpLine}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {breadcrumb}
      {searchInput}
      {selectionCountLine}
      {loadingRow}
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
                      label={
                        maxWidth
                          ? truncateLabel(item.label, maxWidth, truncate)
                          : item.label
                      }
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
      {helpLine}
    </Box>
  )
}
