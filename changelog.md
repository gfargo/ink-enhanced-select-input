# Changelog

## [1.2.1](https://github.com/gfargo/ink-enhanced-select-input/compare/v1.2.0...v1.2.1) (2026-08-11)


### 🐞 Bug Fixes

* **release-please:** match existing plain v-prefixed tag convention ([3848ae6](https://github.com/gfargo/ink-enhanced-select-input/commit/3848ae64fe22ab30babcbce893fce3753201fa4c))

## [1.2.0](https://github.com/gfargo/ink-enhanced-select-input/compare/v1.1.1...v1.2.0) (2026-08-11)

### 🌟 New Features

- **enhanced-select-input:** custom filter, fuzzy matching, match highlighting ([#119](https://github.com/gfargo/ink-enhanced-select-input/issues/119)) ([74a0c40](https://github.com/gfargo/ink-enhanced-select-input/commit/74a0c401774c24eddb0dbc81d8a3de22945e8e23))
- **enhanced-select-input:** search field text-input ergonomics (F3) ([#133](https://github.com/gfargo/ink-enhanced-select-input/issues/133)) ([4c247dc](https://github.com/gfargo/ink-enhanced-select-input/commit/4c247dc7f961907e729e1b919819e8691b4003a8))
- **enhanced-select-input:** F4 — onSearchChange, controlled searchQuery, isLoading, searchDebounce ([#141](https://github.com/gfargo/ink-enhanced-select-input/issues/141)) ([e083af6](https://github.com/gfargo/ink-enhanced-select-input/commit/e083af6b4e15fb2de1770e2452ac40f279b2f4a7))
- **headless:** hook ergonomics — windowIndex, selectedItem, imperative setters ([#99](https://github.com/gfargo/ink-enhanced-select-input/issues/99)) ([5fe3199](https://github.com/gfargo/ink-enhanced-select-input/commit/5fe319966e58266a309a964e86132533ff2862af))
- **item:** description/hint text, separator items, disabledReason ([#129](https://github.com/gfargo/ink-enhanced-select-input/issues/129)) ([3b365c0](https://github.com/gfargo/ink-enhanced-select-input/commit/3b365c076a64a4bb6aa22b75e1da63c5ee10527f))
- **keyboard:** add Page Up/Down navigation and configurable loop wrap-around ([#120](https://github.com/gfargo/ink-enhanced-select-input/issues/120)) ([99c1de4](https://github.com/gfargo/ink-enhanced-select-input/commit/99c1de4e10c1fcbfb251905a54f878e286e467a7))
- **multi-select:** bulk select-all/none/invert, min/max constraints, selection count, custom indicators ([#122](https://github.com/gfargo/ink-enhanced-select-input/issues/122)) ([7d2035c](https://github.com/gfargo/ink-enhanced-select-input/commit/7d2035cbdec72b21b4413a8079e0e7bc2102f816))
- **pagination:** cursor-following scroll pagination mode ([#118](https://github.com/gfargo/ink-enhanced-select-input/issues/118)) ([8978c9a](https://github.com/gfargo/ink-enhanced-select-input/commit/8978c9a14c30975788dde591a2d44ed5776aaec1))
- **peer-deps:** widen Ink support to ^6 || ^7 ([#98](https://github.com/gfargo/ink-enhanced-select-input/issues/98)) ([50f795b](https://github.com/gfargo/ink-enhanced-select-input/commit/50f795bab4468720e2845e5bb614e8b82a5e43d7))
- **select-input:** add controlled mode for index + multi-select keys ([#117](https://github.com/gfargo/ink-enhanced-select-input/issues/117)) ([1279481](https://github.com/gfargo/ink-enhanced-select-input/commit/1279481bdca68258d9d0d92f5664d4bc10f38cad))
- **select-input:** F8 label truncation and width control ([#121](https://github.com/gfargo/ink-enhanced-select-input/issues/121)) ([5a30710](https://github.com/gfargo/ink-enhanced-select-input/commit/5a3071016438be9b7b023a695b5b0ecb4e293f66))
- **select-input:** select by value/key instead of index ([#131](https://github.com/gfargo/ink-enhanced-select-input/issues/131)) ([e80c3c5](https://github.com/gfargo/ink-enhanced-select-input/commit/e80c3c586583045054d204b2ec7bde0beca247d1))
- **theming:** add theme prop and NO_COLOR support ([#126](https://github.com/gfargo/ink-enhanced-select-input/issues/126)) ([e55f73c](https://github.com/gfargo/ink-enhanced-select-input/commit/e55f73c61b69e961f7af21755877050126a042af))
- **typeahead:** add opt-in type-ahead jump for non-searchable mode ([#109](https://github.com/gfargo/ink-enhanced-select-input/issues/109)) ([c926264](https://github.com/gfargo/ink-enhanced-select-input/commit/c9262644ad6b1ee3a8e3edc42f1619cf2f4c07bd))
- **types:** rename exported \*Properties types to \*Props convention, keep deprecated aliases ([#137](https://github.com/gfargo/ink-enhanced-select-input/issues/137)) ([e78fcd6](https://github.com/gfargo/ink-enhanced-select-input/commit/e78fcd62eaa5e4751278f347a20d22122df21240))

### 🐞 Bug Fixes

- **confirm:** onConfirm no longer drops checked items hidden by search filter ([#100](https://github.com/gfargo/ink-enhanced-select-input/issues/100)) ([e156cf0](https://github.com/gfargo/ink-enhanced-select-input/commit/e156cf0bea517813fb9d795faa2df56b1b85911f))
- **enhanced-select-input:** guard empty-string hotkey against empty input ([#132](https://github.com/gfargo/ink-enhanced-select-input/issues/132)) ([9f888bd](https://github.com/gfargo/ink-enhanced-select-input/commit/9f888bd218c969386779ca5e600ed76ba3d36258))
- **enhanced-select-input:** ignore Kitty keyboard protocol key-release events ([#139](https://github.com/gfargo/ink-enhanced-select-input/issues/139)) ([6cc9b84](https://github.com/gfargo/ink-enhanced-select-input/commit/6cc9b845558bdb9ece25c4c6c072027d05b3fd39))
- **enhanced-select-input:** keep search prompt on its own line in horizontal orientation ([#130](https://github.com/gfargo/ink-enhanced-select-input/issues/130)) ([4aa4994](https://github.com/gfargo/ink-enhanced-select-input/commit/4aa4994eb36d3e9621a3cd38ff94c41d4717d17f))
- **enhanced-select-input:** never let Enter/Tab leak into the search query ([#138](https://github.com/gfargo/ink-enhanced-select-input/issues/138)) ([312229d](https://github.com/gfargo/ink-enhanced-select-input/commit/312229d882677cf397215f4a22bc62e986b04c80))
- **enhanced-select-input:** prune checkedKeys for items removed from items ([#140](https://github.com/gfargo/ink-enhanced-select-input/issues/140)) ([b299180](https://github.com/gfargo/ink-enhanced-select-input/commit/b299180eecc943cb2a8cddbc4eba5f1a8e089886))
- **enhanced-select-input:** stop duplicate-key scan from running every render ([#142](https://github.com/gfargo/ink-enhanced-select-input/issues/142)) ([01aae54](https://github.com/gfargo/ink-enhanced-select-input/commit/01aae543ac333db6dee4b1ade123fc48e305312b))
- **enhanced-select-input:** truncate overlong labels instead of wrapping ([#127](https://github.com/gfargo/ink-enhanced-select-input/issues/127)) ([7fbe24f](https://github.com/gfargo/ink-enhanced-select-input/commit/7fbe24fedc4c20533fe6dfdf76aa8331e54f318d))
- **enhanced-select-input:** warn once per distinct duplicate-key set ([#128](https://github.com/gfargo/ink-enhanced-select-input/issues/128)) ([58963e8](https://github.com/gfargo/ink-enhanced-select-input/commit/58963e8169fbd9fba227db69f6d82d8c50e51f39))
- **group-header:** emit header on adjacency change, not set membership ([#95](https://github.com/gfargo/ink-enhanced-select-input/issues/95)) ([265febc](https://github.com/gfargo/ink-enhanced-select-input/commit/265febcbf90838f389044cffaa4e8d150fee9208))
- **highlight:** key onHighlight off item identity, not index ([#107](https://github.com/gfargo/ink-enhanced-select-input/issues/107)) ([e4d6af4](https://github.com/gfargo/ink-enhanced-select-input/commit/e4d6af4b31e2c41cc574c04ce11f59b67f18e026))
- **hook:** stop onHighlight from refiring on every parent re-render ([#112](https://github.com/gfargo/ink-enhanced-select-input/issues/112)) ([7e8631c](https://github.com/gfargo/ink-enhanced-select-input/commit/7e8631c845be1aab0e1f1351c2ffabda698da52e))
- **hooks:** remove exhaustive-deps suppressions in useEnhancedSelectInput ([#108](https://github.com/gfargo/ink-enhanced-select-input/issues/108)) ([af62974](https://github.com/gfargo/ink-enhanced-select-input/commit/af62974df92452c96eb8f40da112e9f015429f90))
- **keymap:** decouple item hotkeys from keyMap.select ([#124](https://github.com/gfargo/ink-enhanced-select-input/issues/124)) ([4811859](https://github.com/gfargo/ink-enhanced-select-input/commit/4811859072dd9ff336413c324218fe681ae96612))
- **keys:** Ctrl/Alt chords fire item hotkeys and vim navigation ([#113](https://github.com/gfargo/ink-enhanced-select-input/issues/113)) ([6f65e45](https://github.com/gfargo/ink-enhanced-select-input/commit/6f65e4570a4b837038a08d3bcfaad9f2cb3c6f46))
- **keys:** handle Escape → onCancel before the hasItems guard ([#104](https://github.com/gfargo/ink-enhanced-select-input/issues/104)) ([e3913c0](https://github.com/gfargo/ink-enhanced-select-input/commit/e3913c0fee99e69967151124f098360f3c29d7e1))
- **multi-select:** confirm the committed checked set on same-tick Space+Enter ([#105](https://github.com/gfargo/ink-enhanced-select-input/issues/105)) ([e4b5f81](https://github.com/gfargo/ink-enhanced-select-input/commit/e4b5f81b46ad38f601406b627cd1009b1eb900ad))
- **multi-select:** drop disabled keys from defaultSelectedKeys seeding ([#110](https://github.com/gfargo/ink-enhanced-select-input/issues/110)) ([4a1085c](https://github.com/gfargo/ink-enhanced-select-input/commit/4a1085c6bbc7ea490af98bf78145adeeef237cab))
- **pagination:** budget group headers into limit's row count ([#97](https://github.com/gfargo/ink-enhanced-select-input/issues/97)) ([a3d93af](https://github.com/gfargo/ink-enhanced-select-input/commit/a3d93afa98945c85e1a04a0b893ca7a0691a55f2))
- **select-input:** document and warn on item.indicator + multiple ([#115](https://github.com/gfargo/ink-enhanced-select-input/issues/115)) ([be2d405](https://github.com/gfargo/ink-enhanced-select-input/commit/be2d4050200886d30a251dd73ab541b812af48fe))
- **select-input:** suppress selection cursor when the resolved item is disabled ([#116](https://github.com/gfargo/ink-enhanced-select-input/issues/116)) ([70efbec](https://github.com/gfargo/ink-enhanced-select-input/commit/70efbeca907d762fa39a4e4d6859cca0dc86bfd4))

### 📦 Code Refactoring

- **enhanced-select-input:** consolidate orientation nav-key mapping into one config ([#136](https://github.com/gfargo/ink-enhanced-select-input/issues/136)) ([8abef06](https://github.com/gfargo/ink-enhanced-select-input/commit/8abef06ef561d4d0e43e2da8c527a9d4b7fa108e))
- **enhanced-select-input:** extract useInput handler into resolve-intent + dispatch ([#102](https://github.com/gfargo/ink-enhanced-select-input/issues/102)) ([60c2c7b](https://github.com/gfargo/ink-enhanced-select-input/commit/60c2c7bc244343efe035a3e71520360cba5d4cbf))
- **hook:** derive rotateIndex from selectedIndex instead of storing it ([#106](https://github.com/gfargo/ink-enhanced-select-input/issues/106)) ([05e6999](https://github.com/gfargo/ink-enhanced-select-input/commit/05e699916d82077beefe32648c82767d5325fbe0))
- **select-input:** use itemKey helper consistently in render ([#111](https://github.com/gfargo/ink-enhanced-select-input/issues/111)) ([ace1c6a](https://github.com/gfargo/ink-enhanced-select-input/commit/ace1c6add5aa10b1ad91099adfaf070dda4b624f))

### 📝 Documentation

- **enhanced-select-input:** explain why forward-Delete mirrors Backspace in search ([#134](https://github.com/gfargo/ink-enhanced-select-input/issues/134)) ([5ca1798](https://github.com/gfargo/ink-enhanced-select-input/commit/5ca1798297ad9c7d874d515a003dd50495d537c5))
- **readme:** document defaultSelectedKeys as mount-only ([#125](https://github.com/gfargo/ink-enhanced-select-input/issues/125)) ([abac1ad](https://github.com/gfargo/ink-enhanced-select-input/commit/abac1adae82b525ba3863b4c4ee626386bd62408))
- **readme:** fix type names and headless hook index comparison ([#114](https://github.com/gfargo/ink-enhanced-select-input/issues/114)) ([a116244](https://github.com/gfargo/ink-enhanced-select-input/commit/a116244c88d86802d67af3f5c21d422121336e20))

### 🚀 Performance Improvements

- **enhanced-select-input:** lazily resolve initial selection ([#135](https://github.com/gfargo/ink-enhanced-select-input/issues/135)) ([1855289](https://github.com/gfargo/ink-enhanced-select-input/commit/1855289d255706c8ce8b72fe37b75f361e5e3567))
- **pagination:** binary-search page lookups + 10k-item benchmark ([#103](https://github.com/gfargo/ink-enhanced-select-input/issues/103)) ([071ec70](https://github.com/gfargo/ink-enhanced-select-input/commit/071ec704971ff4a5eb35730da9765a61dc34c2ca))

### ✅ Tests

- **resolve-input-intent:** lock in B14 empty-hotkey guarantee ([#123](https://github.com/gfargo/ink-enhanced-select-input/issues/123)) ([0497067](https://github.com/gfargo/ink-enhanced-select-input/commit/049706732f7aa92ee561cfd324a5071dc5888f3a))

## [1.1.0](https://github.com/gfargo/ink-enhanced-select-input/compare/v1.0.0...v1.1.0) (2026-05-14)

### 🌟 New Features

- add keyMap prop for selective key group disabling ([46f7b8a](https://github.com/gfargo/ink-enhanced-select-input/commit/46f7b8a6c689c831a331f170badfcf4dd38e8935))

## [1.0.0](https://github.com/gfargo/ink-enhanced-select-input/compare/v0.6.0...v1.0.0) (2026-05-05)

### 🌟 New Features

- add item group support with section headers ([#13](https://github.com/gfargo/ink-enhanced-select-input/issues/13)) ([#25](https://github.com/gfargo/ink-enhanced-select-input/issues/25)) ([32b5e52](https://github.com/gfargo/ink-enhanced-select-input/commit/32b5e52c24fe0f01e5f7d9df24123191f6237d95))
- add searchable mode for inline item filtering ([#14](https://github.com/gfargo/ink-enhanced-select-input/issues/14)) ([#26](https://github.com/gfargo/ink-enhanced-select-input/issues/26)) ([0c81254](https://github.com/gfargo/ink-enhanced-select-input/commit/0c812548cdbaf275b4161b0a7aece2ad1d04b65f))

## [0.6.0](https://github.com/gfargo/ink-enhanced-select-input/compare/0.5.0...v0.6.0) (2026-05-05)

### 🌟 New Features

- add multi-select mode ([#12](https://github.com/gfargo/ink-enhanced-select-input/issues/12)) ([#24](https://github.com/gfargo/ink-enhanced-select-input/issues/24)) ([aca72bb](https://github.com/gfargo/ink-enhanced-select-input/commit/aca72bbbce5c25fcdaa1190fd919f2eb9d5ee85d))

### 🐞 Bug Fixes

- rename release config file ([d192ec4](https://github.com/gfargo/ink-enhanced-select-input/commit/d192ec4550837f772bb6a54271d0c5d8525bb15f))
- warn in development when duplicate item keys are detected ([#16](https://github.com/gfargo/ink-enhanced-select-input/issues/16)) ([#23](https://github.com/gfargo/ink-enhanced-select-input/issues/23)) ([29dcacd](https://github.com/gfargo/ink-enhanced-select-input/commit/29dcacdd31c35a1ecf43a68eec01936ca2fe4cf6))

## [0.5.0](https://github.com/gfargo/ink-enhanced-select-input/compare/0.4.0...0.5.0) (2026-05-05)

### 🌟 New Features

- add showScrollIndicators prop for paginated lists ([#9](https://github.com/gfargo/ink-enhanced-select-input/issues/9)) ([#20](https://github.com/gfargo/ink-enhanced-select-input/issues/20)) ([4557707](https://github.com/gfargo/ink-enhanced-select-input/commit/4557707ccadeb0fc50523883f43acdec22596a4e))
- extract useEnhancedSelectInput headless hook ([#8](https://github.com/gfargo/ink-enhanced-select-input/issues/8)) ([#21](https://github.com/gfargo/ink-enhanced-select-input/issues/21)) ([7c1e0a1](https://github.com/gfargo/ink-enhanced-select-input/commit/7c1e0a1a3785a04fd394fc26da45148dc1789648))
- onCancel/Escape, Home/End keys, and bug fixes ([#19](https://github.com/gfargo/ink-enhanced-select-input/issues/19)) ([d459214](https://github.com/gfargo/ink-enhanced-select-input/commit/d45921417dc3593b91a6f612a05d811e21a545c8)), closes [#10](https://github.com/gfargo/ink-enhanced-select-input/issues/10) [#11](https://github.com/gfargo/ink-enhanced-select-input/issues/11) [#16](https://github.com/gfargo/ink-enhanced-select-input/issues/16) [#17](https://github.com/gfargo/ink-enhanced-select-input/issues/17)

### 🐞 Bug Fixes

- audit improvements — bugs, exports, and test coverage ([#18](https://github.com/gfargo/ink-enhanced-select-input/issues/18)) ([bc75b17](https://github.com/gfargo/ink-enhanced-select-input/commit/bc75b17d71444d6ecea050c843cdfdb74416552d))
- re-sync selection when items prop changes after mount ([#15](https://github.com/gfargo/ink-enhanced-select-input/issues/15)) ([#22](https://github.com/gfargo/ink-enhanced-select-input/issues/22)) ([89dfcb1](https://github.com/gfargo/ink-enhanced-select-input/commit/89dfcb1d61286b418782dfdbbfcf6710fec47ce8))

## [0.4.0](https://github.com/gfargo/ink-enhanced-select-input/compare/0.3.0...0.4.0) (2026-03-24)

### 🐞 Bug Fixes

- limit prop now paginates — all items reachable via navigation ([e4d243f](https://github.com/gfargo/ink-enhanced-select-input/commit/e4d243f6c7249a2fa02b1e6b10d251ae73f957ca)), closes [#5](https://github.com/gfargo/ink-enhanced-select-input/issues/5)
- resolve lint and formatting issues ([acd5747](https://github.com/gfargo/ink-enhanced-select-input/commit/acd574763f0954bd7717c1b9caf59fa37eaef116))
- skip disabled items when resolving initialIndex ([4defb10](https://github.com/gfargo/ink-enhanced-select-input/commit/4defb10cd1a7d444093d547d550f20514b9302d9)), closes [#4](https://github.com/gfargo/ink-enhanced-select-input/issues/4)

### ✅ Tests

- remove snapshot assertions for CI compatibility ([051f5c8](https://github.com/gfargo/ink-enhanced-select-input/commit/051f5c8452fa4eba31b8be0cee2706b30286967f))

## [0.3.0](https://github.com/gfargo/ink-enhanced-select-input/compare/0.2.0...0.3.0) (2026-03-21)

### 📝 Documentation

- **readme:** update compatibility and usage info ([5f9814a](https://github.com/gfargo/ink-enhanced-select-input/commit/5f9814ae9669f89135988d122f5bcbc6e98f1917))

## [0.2.0](https://github.com/gfargo/ink-enhanced-select-input/compare/0.1.2...0.2.0) (2025-01-02)

## [0.1.2](https://github.com/gfargo/ink-enhanced-select-input/compare/0.1.1...0.1.2) (2024-12-19)

## [0.1.1](https://github.com/gfargo/ink-enhanced-select-input/compare/0.1.0...0.1.1) (2024-12-19)

## 0.1.0 (2024-12-19)
