import { render } from 'ink-testing-library'
import React, { type ReactElement } from 'react'

// The `Instance` type ink-testing-library returns isn't exported, and its
// structural shape includes classes with private fields — inferring
// `renderStrict`'s return type from `render(...)` directly trips `tsc`'s
// declaration emit (TS4094: private members can't appear in an exported
// anonymous type). This explicit, narrower return type sidesteps that; it
// only lists what this suite actually reads off the result.
export type StrictRenderResult = {
  rerender: (tree: ReactElement) => void
  unmount: () => void
  lastFrame: () => string | undefined
  stdin: { write: (data: string) => void }
}

/**
 * Wraps `ui` in `<React.StrictMode>` before handing it to
 * ink-testing-library's `render()`. Use this instead of the plain `render()`
 * for tests that need to guard against StrictMode-sensitive bugs — e.g. a
 * callback fired from inside a functional state-updater, which StrictMode
 * invokes more than once in React DOM.
 */
export function renderStrict(ui: ReactElement): StrictRenderResult {
  return render(<React.StrictMode>{ui}</React.StrictMode>)
}
