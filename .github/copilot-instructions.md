## Purpose

This repository implements a Tweakpane input plugin (tree control). The guidance below helps an AI coding assistant make productive, low-risk changes: follow the project's conventions, wire into build scripts, and reference the plugin contracts in `@arijs/tweakpane-core`.

## Key files to read first

- `src/plugin.ts` — plugin shape, accepted params, `reader`/`writer` behavior and the external value (`TreeValue`).
- `src/controller.ts` — controller lifecycle and how value updates are propagated.
- `src/view.ts` — DOM structure and CSS class naming (uses `ClassName('tree')`).
- `src/index.ts` — bundle exports (`css` token, `plugins` array).
- `rollup.config.js` — CSS injection (`__css__` replacement), build outputs, and dev vs prod flags.
- `scripts/*` — packaging helpers (`dist-name.js`, `assets-append-version.js`).
- `test/browser.html` — minimal manual test/visual example used by `npm run start`.

## Big-picture architecture notes

- This is a small single-plugin package. The plugin is implemented using the `InputBindingPlugin` contract from `@arijs/tweakpane-core` (see `createPlugin(...)` in `src/plugin.ts`).
- Data flow: external bound object (consumer) -> `binding.reader` (reads only `treePathIndices`) -> plugin holds internal `TreeValue` -> user interactions call controller -> controller sets `value.rawValue` -> `binding.writer` writes all three properties back to the consumer.
- The CSS is compiled from `src/sass/plugin.scss` and inlined into the `css` export by the Rollup `Replace` plugin via the `__css__` token. Do not search for a separate compiled CSS file — it's embedded at build time.

## Project-specific conventions

- Value shape: the external value must have { treePathIndices, treePathValues, leafValue }. The plugin's `reader` intentionally reads only `treePathIndices` (see `binding.reader` in `src/plugin.ts`). Respect that when changing reading behavior.
- DOM semantics: the view uses native `<details>` / `<summary>` for nodes and plain `<div>` for options. Keep accessibility and native behavior in mind when editing `view.ts`.
- Class naming: use the `ClassName('tree')` helper in `view.ts` (example: `className('container')`) — don't hardcode Tweakpane class names elsewhere.
- Export shape: `src/index.ts` exports `id`, `css`, and `plugins = [TreeInputPlugin]`. Consumers import the plugin and call `pane.registerPlugin(...)` (see README example).

## Build / dev / test workflows (explicit commands)

- Install deps: `npm install` (repository uses npm; devDependencies are listed in `package.json`).
- Dev server + watch: `npm run start` — runs the bundler watch and a static `http-server` opening `test/browser.html`. Useful for quick visual debugging.
- Build (dev): `npm run build:dev` — rollup build (unminified).
- Build (prod): `npm run build:dts && npm run build:prod` or `npm run build` which runs the `build:*` tasks in parallel; `BUILD=production` environment triggers minification.
- Type definitions: `npm run build:dts` runs `tsc --project src/tsconfig-dts.json` (dts build uses a separate tsconfig in `src`).
- Lint/test: `npm test` — currently runs `eslint` over `src/**/*.ts`. The repo treats lint as the unit test.
- Packaging helpers: after build, `npm run assets` will append versions and create zip artifacts.

Notes: CI or prepublish steps call `npm test` (see `prepublishOnly`), so ensure lint passes before publishing.

## Editing guidance & examples

- Small behavior changes: prefer editing `controller.ts` (logic) and `view.ts` (rendering) together. Keep controller/view plumbing: controller creates `PluginView` and passes `onSelectItem` callback.
- Adding config options: add parsing in `accept(...params)` inside `src/plugin.ts` using `parseRecord(...)` (look how `maxHeight` is parsed). Keep acceptance checks defensive (null returns when invalid).
- Changing CSS: update `src/sass/plugin.scss`; rollup compiles and inlines it. To preview styles, run `npm run start` and edit SASS; watch tasks are already configured (`watch:sass`).

## Integration points & dependencies

- Peer dependency: `@arijs/tweakpane` (consumer must provide it). The plugin code uses `@arijs/tweakpane-core` at build time.
- Bundling: the package outputs an ESM file to `dist/` (name derived in `rollup.config.js` and `scripts/dist-name.js`).

## When in doubt — concrete pointers

- If you need to change the external value contract, edit `src/plugin.ts` first and update `binding.reader`/`binding.writer` and `accept(...)` accordingly.
- For DOM/UX tweaks, edit `src/view.ts`. The render functions are `buildTree_`, `renderTreeLevel_`, `renderTreeNode_`, and `renderTreeOption_`.
- For lifecycle or value propagation changes, edit `src/controller.ts`.

## After making changes

1. Run `npm run build:dev` to ensure the bundle compiles.
2. Run `npm test` (eslint) to satisfy prepublish checks.
3. Use `npm run start` and open the served `test/browser.html` to verify visual/interactive behavior.

---
If any section is unclear or you'd like examples expanded (unit test patterns, API surface with `@arijs/tweakpane-core`, or CI steps), tell me which part and I will iterate.
