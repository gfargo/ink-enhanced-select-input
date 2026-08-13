import { fixupConfigRules } from '@eslint/compat'
import xoReact from 'eslint-config-xo-react'

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  // eslint-plugin-react's rules aren't all ESLint-10-native yet — fixupConfigRules
  // shims the ones that still call removed Linter APIs (e.g. context.getSourceCode()).
  ...fixupConfigRules(xoReact()),
  {
    // 'compat': disable ESLint stylistic rules that would conflict with
    // Prettier, instead of XO reformatting to its own opinionated style —
    // `prettier --check .` (using .prettierrc.json) already owns formatting.
    prettier: 'compat',
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
      'react/no-array-index-key': 'off',
      'unicorn/filename-case': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
      ],

      // The rules below are new defaults picked up by the xo@4 major bump
      // (newer eslint-config-xo-typescript / eslint-plugin-unicorn /
      // eslint-plugin-react-hooks). Turned off here to keep this upgrade to
      // a config-format migration, not a drive-by rule adoption — each one
      // is a legitimate hardening rule worth a dedicated follow-up pass:
      //  - strict-boolean-expressions / no-unsafe-* / no-deprecated /
      //    require-unicode-regexp / regexp/strict: real type-safety work,
      //    needs case-by-case review across ~40 call sites.
      //  - unicorn/consistent-boolean-name: would rename public API props
      //    (e.g. `disabled`) — a breaking change, not a lint fix.
      //  - jsdoc/require-asterisk-prefix: reformats every hand-written
      //    JSDoc block; pure style churn with no functional value.
      //  - curly: ~110 call sites currently use bare-statement `if`s.
      //  - react/jsx-no-leaked-render, react-hooks/refs,
      //    react-hooks/set-state-in-effect: newer React rules needing
      //    per-callsite review, not a mechanical fix.
      curly: 'off',
      complexity: 'warn',
      'max-lines': 'warn',
      'max-params': 'warn',
      'jsdoc/require-asterisk-prefix': 'off',
      'require-unicode-regexp': 'off',
      'regexp/strict': 'off',
      'react/jsx-no-leaked-render': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'unicorn/consistent-boolean-name': 'off',
      'unicorn/prefer-unicode-code-point-escapes': 'off',
      'unicorn/no-useless-coercion': 'off',
      'unicorn/prefer-split-limit': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-break-in-nested-loop': 'off',
      'unicorn/no-declarations-before-early-exit': 'off',
      'ava/use-true-false': 'off',
      // Conflicts with Prettier: Prettier strips the disambiguating parens
      // this rule asks for on reprint, so the two fight in a loop.
      '@stylistic/no-mixed-operators': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      'arrow-body-style': 'off',
      'unicorn/no-subtraction-comparison': 'off',
      'unicorn/name-replacements': 'off',
      'unicorn/no-top-level-side-effects': 'off',
      'unicorn/no-exports-in-scripts': 'off',
    },
  },
]

export default xoConfig
