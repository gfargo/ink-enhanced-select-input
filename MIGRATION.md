# Migration Guide: Keyboard Behavior (`v0.2.0` → `v1.x`)

This note documents keyboard-behavior changes between the pre-v1 `v0.2.0`
release and the current `v1.x` line. It only covers keyboard/input behavior —
for the full current-state keyboard reference, see
[`## Keyboard Navigation`](./readme.md#keyboard-navigation) in the readme.

> **Provenance / please verify:** The `v1.x` side of this doc is verified
> against the current source. The `v0.2.0` side is reconstructed from the
> tagged `0.2.0` source (`git show 0.2.0:src/enhanced-select-input/index.tsx`)
> and [`changelog.md`](./changelog.md), not copied from a v0.2.0-era spec or
> release notes — a human familiar with the actual `v0.2.0` release should
> confirm the "Before" column before treating this as authoritative.

## Summary

| Behavior                                 | `v0.2.0`                                             | `v1.x`                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Arrow keys                               | ✅ (`↑↓` vertical, `←→` horizontal)                  | ✅ (also configurable via `keyMap.arrows`)                                                                      |
| Vim keys (`h/j/k/l`)                     | ✅, but could **double-fire** with a matching hotkey | ✅, and take priority over hotkeys — a hotkey matching `h/j/k/l` never fires                                    |
| `Home` / `End`                           | ❌ not supported                                     | ✅ jump to first/last selectable item (`keyMap.homeEnd`)                                                        |
| `Page Up` / `Page Down`                  | ❌ not supported                                     | ✅ page by the visible window size, or 10 when `limit` is unset (`keyMap.pageKeys`)                             |
| `Escape` → `onCancel`                    | ❌ not supported (no `onCancel` prop)                | ✅ (`keyMap.cancel`)                                                                                            |
| `Space` toggle (multi-select)            | ❌ no multi-select mode existed                      | ✅ toggles the highlighted item in `multiple` mode (`keyMap.toggle`)                                            |
| Bulk select (`Ctrl+A`/`Ctrl+D`/`Ctrl+R`) | ❌ not supported                                     | ✅ select-all / select-none / invert in `multiple` mode (`keyMap.bulk`)                                         |
| Hotkeys                                  | ✅, unconditional — fired on every matching keypress | ✅, but disabled in `multiple` and `searchable` modes, and never fire for a reserved vim key (`keyMap.hotkeys`) |
| Per-key-group opt-out (`keyMap`)         | ❌ not supported                                     | ✅ `keyMap` prop disables individual key groups                                                                 |

## Details

### Vim keys (`h/j/k/l`) vs. item hotkeys

In `v0.2.0`, vim-key navigation and hotkey matching ran independently on
every keypress, with no coordination between them. If an item's `hotkey`
happened to equal `'j'`, `'k'`, `'h'`, or `'l'`, pressing that key would
**both** move the highlight **and** immediately fire `onSelect` for whichever
item the hotkey matched — a silent double-action.

`v1.x` resolves this: navigation keys take priority over hotkeys. In vertical
orientation, `j`/`k` are reserved for navigation and an item hotkey set to
either value will never fire; in horizontal orientation, `h`/`l` are
reserved the same way. See the constraint documented at
[`readme.md`](./readme.md#keyboard-navigation) ("Hotkey constraints") and
enforced in `src/enhanced-select-input/index.tsx` (`resolveHotkeyIntent`,
guarded by `isActiveVimKey`, and the `NAV_CONFIG`/`NAV_VIM_KEYS` tables
around lines 538–570).

### `Home` / `End`

Not present in `v0.2.0`. In `v1.x`, `Home`/`End` jump to the first/last
selectable item, skipping disabled items, and always jump to the absolute
boundary regardless of the `loop` setting (`keyMap.homeEnd`, default `true`).

### `Escape` → `onCancel`

Not present in `v0.2.0` — there was no `onCancel` prop and no `Escape`
handling at all. In `v1.x`, `Escape` calls `onCancel` when the prop is
provided (`keyMap.cancel`, default `true`), useful for "go back" in
multi-step CLI flows. In searchable mode, `Escape` clears the query first and
only calls `onCancel` when the query is already empty.

### `Space` toggle (multi-select)

`v0.2.0` had no multi-select mode at all — every selection was single-select
via `Enter` or a hotkey. `v1.x` adds `multiple={true}` mode, where `Space`
toggles the highlighted item's checked state and `Enter` calls `onConfirm`
with all checked items (`keyMap.toggle`, default `true`). Hotkeys are
disabled entirely in multi-select mode to avoid ambiguity with `Space`.

### Hotkey-vs-vim-key precedence rules

Summarizing the rule enforced in `src/enhanced-select-input/index.tsx`
(`resolveHotkeyIntent`, ~lines 1303–1342, and the reserved-key tables at
~lines 538–570):

- A hotkey is only considered when it is **not** one of the active vim keys
  for the current orientation (`j`/`k` vertical, `h`/`l` horizontal).
- Hotkeys are disabled outright in `multiple` and `searchable` modes.
- Hotkeys never fire for Ctrl/Alt-modified chords.

None of this existed in `v0.2.0`: hotkeys matched unconditionally against
`input`, regardless of orientation, mode, or whether the same key also
triggered navigation.

### `keyMap` opt-outs

`v0.2.0` had no way to disable individual key groups — all handled keys were
always active. `v1.x` adds the `keyMap` prop (introduced in `v1.1.0`) so a
host application that already binds one of these keys globally can turn off
just that group (e.g. `keyMap={{ vimKeys: false }}`) without losing the
rest of the component's default keyboard behavior. See the `KeyMap` type in
`src/enhanced-select-input/index.tsx` for the full set of flags
(`arrows`, `vimKeys`, `homeEnd`, `pageKeys`, `cancel`, `select`, `toggle`,
`bulk`, `hotkeys`, `search`), all defaulting to `true`.

## Further reading

- [`## Keyboard Navigation`](./readme.md#keyboard-navigation) — current-state keyboard reference
- [`changelog.md`](./changelog.md) — full release history
