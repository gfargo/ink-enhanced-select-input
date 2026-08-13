import test from 'ava'
import {
  buildHelpSegments,
  type KeyMap,
} from '../enhanced-select-input/index.js'

const FULL_KEY_MAP: Required<KeyMap> = {
  arrows: true,
  vimKeys: true,
  homeEnd: true,
  pageKeys: true,
  cancel: true,
  select: true,
  toggle: true,
  bulk: true,
  hotkeys: true,
  search: true,
}

const defaultOptions = { multiple: false, searchable: false, isVertical: true }

test('buildHelpSegments: default vertical single-select', (t) => {
  t.deepEqual(buildHelpSegments(FULL_KEY_MAP, defaultOptions), [
    '↑↓ navigate',
    'enter select',
    'esc cancel',
  ])
})

test('buildHelpSegments: horizontal orientation uses ←→', (t) => {
  const segments = buildHelpSegments(FULL_KEY_MAP, {
    ...defaultOptions,
    isVertical: false,
  })
  t.true(segments.includes('←→ navigate'))
  t.false(segments.includes('↑↓ navigate'))
})

test('buildHelpSegments: multiple shows toggle and confirm, not select', (t) => {
  const segments = buildHelpSegments(FULL_KEY_MAP, {
    ...defaultOptions,
    multiple: true,
  })
  t.true(segments.includes('space toggle'))
  t.true(segments.includes('enter confirm'))
  t.false(segments.includes('enter select'))
})

test('buildHelpSegments: searchable adds type-to-search segment', (t) => {
  const segments = buildHelpSegments(FULL_KEY_MAP, {
    ...defaultOptions,
    searchable: true,
  })
  t.true(segments.includes('type to search'))
})

test('buildHelpSegments: disabling arrows and vimKeys drops navigate', (t) => {
  const km = { ...FULL_KEY_MAP, arrows: false, vimKeys: false }
  const segments = buildHelpSegments(km, defaultOptions)
  t.false(segments.some((segment) => segment.includes('navigate')))
})

test('buildHelpSegments: disabling select drops the enter segment', (t) => {
  const km = { ...FULL_KEY_MAP, select: false }
  const segments = buildHelpSegments(km, defaultOptions)
  t.false(segments.some((segment) => segment.startsWith('enter')))
})

test('buildHelpSegments: disabling cancel drops esc segment', (t) => {
  const km = { ...FULL_KEY_MAP, cancel: false }
  const segments = buildHelpSegments(km, defaultOptions)
  t.false(segments.includes('esc cancel'))
})

test('buildHelpSegments: disabling toggle drops space segment in multi-select', (t) => {
  const km = { ...FULL_KEY_MAP, toggle: false }
  const segments = buildHelpSegments(km, { ...defaultOptions, multiple: true })
  t.false(segments.includes('space toggle'))
})

test('buildHelpSegments: everything disabled returns an empty array', (t) => {
  const km = {
    ...FULL_KEY_MAP,
    arrows: false,
    vimKeys: false,
    select: false,
    cancel: false,
    toggle: false,
    search: false,
  }
  t.deepEqual(
    buildHelpSegments(km, {
      multiple: true,
      searchable: true,
      isVertical: true,
    }),
    []
  )
})
