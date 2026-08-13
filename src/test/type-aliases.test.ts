import test from 'ava'
import type {
  BreadcrumbProperties,
  BreadcrumbProps,
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
type BreadcrumbAliasLock = AssertEqual<BreadcrumbProperties, BreadcrumbProps>
type SeparatorAliasLock = AssertEqual<SeparatorProperties, SeparatorProps>
type UseHookAliasLock = AssertEqual<
  UseEnhancedSelectInputProperties<string>,
  UseEnhancedSelectInputProps<string>
>

// Negative control: proves `AssertEqual` actually distinguishes structurally
// different types rather than degenerating to `true` for any pair — without
// this, the locks above would pass even if `AssertEqual` were broken.
type NegativeControlLock = AssertEqual<ItemProps, GroupHeaderProps>

export const aliasLocks: {
  properties: PropertiesAliasLock
  indicator: IndicatorAliasLock
  item: ItemAliasLock
  groupHeader: GroupHeaderAliasLock
  breadcrumb: BreadcrumbAliasLock
  separator: SeparatorAliasLock
  useHook: UseHookAliasLock
  negativeControl: NegativeControlLock
} = {
  properties: true,
  indicator: true,
  item: true,
  groupHeader: true,
  breadcrumb: true,
  separator: true,
  useHook: true,
  negativeControl: false,
}

test('deprecated *Properties aliases stay structurally identical to their *Props primaries', (t) => {
  t.deepEqual(aliasLocks, {
    properties: true,
    indicator: true,
    item: true,
    groupHeader: true,
    breadcrumb: true,
    separator: true,
    useHook: true,
    negativeControl: false,
  })
})
