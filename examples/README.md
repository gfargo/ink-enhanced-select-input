# Examples

Zero-build, runnable demos of each `ink-enhanced-select-input` feature. Each file is self-contained — run it directly with `ts-node`'s ESM loader, no `yarn build` required:

```bash
node --loader ts-node/esm examples/01-vertical.tsx
```

| File                                                                 | Feature                                                              | Run                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`01-vertical.tsx`](./01-vertical.tsx)                               | Vertical orientation (default)                                       | `node --loader ts-node/esm examples/01-vertical.tsx`                |
| [`02-horizontal.tsx`](./02-horizontal.tsx)                           | Horizontal orientation                                               | `node --loader ts-node/esm examples/02-horizontal.tsx`              |
| [`03-hotkeys.tsx`](./03-hotkeys.tsx)                                 | Hotkey selection                                                     | `node --loader ts-node/esm examples/03-hotkeys.tsx`                 |
| [`04-disabled-items.tsx`](./04-disabled-items.tsx)                   | Disabled items, descriptions, hints & disabled reasons               | `node --loader ts-node/esm examples/04-disabled-items.tsx`          |
| [`05-custom-indicators.tsx`](./05-custom-indicators.tsx)             | Per-item custom `indicator`                                          | `node --loader ts-node/esm examples/05-custom-indicators.tsx`       |
| [`06-custom-item-component.tsx`](./06-custom-item-component.tsx)     | Custom `itemComponent` / `indicatorComponent`                        | `node --loader ts-node/esm examples/06-custom-item-component.tsx`   |
| [`07-limit-scroll-indicators.tsx`](./07-limit-scroll-indicators.tsx) | `limit` + `showScrollIndicators`                                     | `node --loader ts-node/esm examples/07-limit-scroll-indicators.tsx` |
| [`08-multi-select.tsx`](./08-multi-select.tsx)                       | Multi-select mode, selection counts, `minSelections`/`maxSelections` | `node --loader ts-node/esm examples/08-multi-select.tsx`            |
| [`09-searchable.tsx`](./09-searchable.tsx)                           | Searchable / inline filtering                                        | `node --loader ts-node/esm examples/09-searchable.tsx`              |
| [`10-item-groups.tsx`](./10-item-groups.tsx)                         | Item groups with section headers                                     | `node --loader ts-node/esm examples/10-item-groups.tsx`             |
| [`11-cancel-escape.tsx`](./11-cancel-escape.tsx)                     | `onCancel` on Escape                                                 | `node --loader ts-node/esm examples/11-cancel-escape.tsx`           |
| [`12-keymap.tsx`](./12-keymap.tsx)                                   | `keyMap` conflict avoidance                                          | `node --loader ts-node/esm examples/12-keymap.tsx`                  |
| [`13-headless-hook.tsx`](./13-headless-hook.tsx)                     | Headless `useEnhancedSelectInput` hook                               | `node --loader ts-node/esm examples/13-headless-hook.tsx`           |

Each example is an interactive Ink app — run it in a real terminal to try it out (arrow keys / vim keys to navigate, Enter to select, Escape to cancel). They exit automatically once a selection or cancellation is made.
