export {
  useEnhancedSelectInput,
  isSeparator,
  isSelectable,
  matchesQuery,
  computeMatchRanges,
} from './enhanced-select-input/index.js'

export type {
  Item,
  SeparatorItem,
  ItemOrSeparator,
  KeyMap,
  MatchMode,
  UseEnhancedSelectInputProps,
  UseEnhancedSelectInputResult,
  // Deprecated alias — kept for backward compatibility, will be removed in
  // a future minor. Prefer `UseEnhancedSelectInputProps`.
  UseEnhancedSelectInputProperties,
} from './enhanced-select-input/index.js'
