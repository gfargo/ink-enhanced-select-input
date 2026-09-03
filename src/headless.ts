export {
  useEnhancedSelectInput,
  isSeparator,
  isSelectable,
  isItem,
  isGroupHeaderRow,
  isNavigable,
  matchesQuery,
  computeMatchRanges,
} from './enhanced-select-input/index.js'

export type {
  Item,
  SeparatorItem,
  ItemOrSeparator,
  GroupHeaderRow,
  NavRow,
  KeyMap,
  MatchMode,
  UseEnhancedSelectInputProps,
  UseEnhancedSelectInputResult,
  // Deprecated alias — kept for backward compatibility, will be removed in
  // a future minor. Prefer `UseEnhancedSelectInputProps`.
  UseEnhancedSelectInputProperties,
} from './enhanced-select-input/index.js'
