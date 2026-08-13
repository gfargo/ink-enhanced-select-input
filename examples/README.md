# Examples

Zero-build, runnable demos of each `ink-enhanced-select-input` feature. Each file is self-contained — run it directly with `ts-node`'s ESM loader, no `yarn build` required:

```bash
node --loader ts-node/esm examples/01-vertical.tsx
```

> [!NOTE]
> Examples are interactive Ink apps and need a real TTY attached to stdin.
> Running one with stdin piped/redirected (e.g. in a non-interactive script or
> CI) prints Ink's "Raw mode is not supported" error instead of the demo, and
> the process may not exit cleanly afterward. Commands are verified against
> the Node version pinned in [`.nvmrc`](../.nvmrc).

| File                                                                 | Feature                                                              | Run                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`01-vertical.tsx`](./01-vertical.tsx)                               | Vertical orientation (default)                                       | `node --loader ts-node/esm examples/01-vertical.tsx`                                  |
| [`02-horizontal.tsx`](./02-horizontal.tsx)                           | Horizontal orientation                                               | `node --loader ts-node/esm examples/02-horizontal.tsx`                                |
| [`03-hotkeys.tsx`](./03-hotkeys.tsx)                                 | Hotkey selection                                                     | `node --loader ts-node/esm examples/03-hotkeys.tsx`                                   |
| [`04-disabled-items.tsx`](./04-disabled-items.tsx)                   | Disabled items, descriptions, hints & disabled reasons               | `node --loader ts-node/esm examples/04-disabled-items.tsx`                            |
| [`05-custom-indicators.tsx`](./05-custom-indicators.tsx)             | Per-item custom `indicator`                                          | `node --loader ts-node/esm examples/05-custom-indicators.tsx`                         |
| [`06-custom-item-component.tsx`](./06-custom-item-component.tsx)     | Custom `itemComponent` / `indicatorComponent`                        | `node --loader ts-node/esm examples/06-custom-item-component.tsx`                     |
| [`07-limit-scroll-indicators.tsx`](./07-limit-scroll-indicators.tsx) | `limit` + `showScrollIndicators`                                     | `node --loader ts-node/esm examples/07-limit-scroll-indicators.tsx`                   |
| [`08-multi-select.tsx`](./08-multi-select.tsx)                       | Multi-select mode, selection counts, `minSelections`/`maxSelections` | `node --loader ts-node/esm examples/08-multi-select.tsx`                              |
| [`09-searchable.tsx`](./09-searchable.tsx)                           | Searchable / inline filtering                                        | `node --loader ts-node/esm examples/09-searchable.tsx`                                |
| [`10-item-groups.tsx`](./10-item-groups.tsx)                         | Item groups with section headers                                     | `node --loader ts-node/esm examples/10-item-groups.tsx`                               |
| [`11-cancel-escape.tsx`](./11-cancel-escape.tsx)                     | `onCancel` on Escape                                                 | `node --loader ts-node/esm examples/11-cancel-escape.tsx`                             |
| [`12-keymap.tsx`](./12-keymap.tsx)                                   | `keyMap` conflict avoidance                                          | `node --loader ts-node/esm examples/12-keymap.tsx`                                    |
| [`13-headless-hook.tsx`](./13-headless-hook.tsx)                     | Headless `useEnhancedSelectInput` hook                               | `TS_NODE_TRANSPILE_ONLY=true node --loader ts-node/esm examples/13-headless-hook.tsx` |
| [`recipes/wizard.tsx`](./recipes/wizard.tsx)                         | Recipe: multi-step wizard (`step` state + `onCancel` to go back)     | `node --loader ts-node/esm examples/recipes/wizard.tsx`                               |
| [`recipes/remote-search.tsx`](./recipes/remote-search.tsx)           | Recipe: `searchable` + simulated remote/async search                 | `node --loader ts-node/esm examples/recipes/remote-search.tsx`                        |
| [`recipes/nested-menus.tsx`](./recipes/nested-menus.tsx)             | Recipe: parent menu swapping in a submenu, with `group` items        | `node --loader ts-node/esm examples/recipes/nested-menus.tsx`                         |

Each example is an interactive Ink app — run it in a real terminal to try it out (arrow keys / vim keys to navigate, Enter to select, Escape to cancel). They exit automatically once a selection or cancellation is made.

`13-headless-hook.tsx` needs `TS_NODE_TRANSPILE_ONLY=true`: ts-node/esm's type-checking pass can race with ESM module loading for that file's hook usage and intermittently crash before rendering. Transpile-only mode skips type-checking (fine for a demo) and avoids the race.
