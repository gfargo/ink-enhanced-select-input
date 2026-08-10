import test from 'ava'
import type {
  EnhancedSelectInputProps,
  GroupHeaderProperties,
  GroupHeaderProps,
  IndicatorProperties,
  IndicatorProps,
  ItemProperties,
  ItemProps,
  Properties,
  SeparatorProperties,
  SeparatorProps,
} from '../index.js'
import type {
  UseEnhancedSelectInputProperties,
  UseEnhancedSelectInputProps,
} from '../headless.js'

// eslint-disable-next-line unicorn/prevent-abbreviations
type ExtReq<A, B> = Required<A> extends Required<B> ? true : false

// Structural equality in both directions, via `Required<>` so a divergence
// as small as one side gaining an *optional* property is still caught (a
// plain mutual `extends` check would let that slide). Locks each deprecated
// `*Properties` alias to its `*Props` primary — if a future edit changes
// one without the other, the mismatched pair fails to satisfy `true` and
// `yarn build` breaks.
type AssertEqual<A, B> = ExtReq<A, B> extends true ? ExtReq<B, A> : false

type PropertiesAliasLock = AssertEqual<
  Properties<string>,
  EnhancedSelectInputProps<string>
>
type IndicatorAliasLock = AssertEqual<IndicatorProperties, IndicatorProps>
type ItemAliasLock = AssertEqual<ItemProperties, ItemProps>
type GroupHeaderAliasLock = AssertEqual<GroupHeaderProperties, GroupHeaderProps>
type SeparatorAliasLock = AssertEqual<SeparatorProperties, SeparatorProps>
type UseHookAliasLock = AssertEqual<
  UseEnhancedSelectInputProperties<string>,
  UseEnhancedSelectInputProps<string>
>

export const aliasLocks: {
  properties: PropertiesAliasLock
  indicator: IndicatorAliasLock
  item: ItemAliasLock
  groupHeader: GroupHeaderAliasLock
  separator: SeparatorAliasLock
  useHook: UseHookAliasLock
} = {
  properties: true,
  indicator: true,
  item: true,
  groupHeader: true,
  separator: true,
  useHook: true,
}

test('deprecated *Properties aliases stay structurally identical to their *Props primaries', (t) => {
  t.deepEqual(aliasLocks, {
    properties: true,
    indicator: true,
    item: true,
    groupHeader: true,
    separator: true,
    useHook: true,
  })
})
