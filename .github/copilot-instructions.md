## Purpose

This repository implements a Tweakpane input plugin (tree control). The guidance below helps an AI coding assistant make productive, low-risk changes: follow the project's conventions, wire into build scripts, and reference the plugin contracts in `@arijs/tweakpane-core`.

## Key files to read first

- `src/plugin.ts` — plugin shape, accepted params, `reader`/`writer` behavior and the external value (`TreeValue`).
- `src/controller.ts` — controller lifecycle and how value updates are propagated.
- `src/view.ts` — DOM structure and CSS class naming (uses `ClassName('tree')`).
- `src/index.ts` — bundle exports (`css` token, `plugins` array).
- `rollup.config.js` — CSS injection (`__css__` replacement), build outputs, and dev vs prod flags.
- `vite.config.ts` — CSS injection (compiled SASS inlined via a small plugin), build outputs, and dev vs prod flags.
- `scripts/*` — packaging helpers (`dist-name.js`, `assets-append-version.js`).
- `test/browser.html` — minimal manual test/visual example used by `npm run start`.
- `docs/dynamic-trees.md` — notes and examples for dynamic tree updates and the view's DOM-diffing behavior.

## Big-picture architecture notes

- This is a small single-plugin package. The plugin is implemented using the `InputBindingPlugin` contract from `@arijs/tweakpane-core` (see `createPlugin(...)` in `src/plugin.ts`).
- Data flow: external bound object (consumer) -> `binding.reader` (reads only `treePathIndices`) -> plugin holds internal `TreeValue` -> user interactions call controller -> controller sets `value.rawValue` -> `binding.writer` writes all three properties back to the consumer.
- The CSS is compiled from `src/sass/plugin.scss` and inlined into the `css` export by the bundler at build time (see `vite.config.ts`). Do not search for a separate compiled CSS file — it's embedded into the bundle.
- DOM diffing / dynamic trees: The view implementation now tries to reuse existing DOM nodes when rebuilding the tree (minimizes reflows and preserves element identity). See `docs/dynamic-trees.md` for details and examples when working on `view.ts`.

## Project-specific conventions

- Value shape: the external value must have { treePathIndices, treePathValues, leafValue }. The plugin's `reader` intentionally reads only `treePathIndices` (see `binding.reader` in `src/plugin.ts`). Respect that when changing reading behavior.
- DOM semantics: the view uses native `<details>` / `<summary>` for nodes and plain `<div>` for options. Keep accessibility and native behavior in mind when editing `view.ts`.
- Class naming: use the `ClassName('tree')` helper in `view.ts` (example: `className('container')`) — don't hardcode Tweakpane class names elsewhere.
- Export shape: `src/index.ts` exports `id`, `css`, and `plugins = [TreeInputPlugin]`. Consumers import the plugin and call `pane.registerPlugin(...)` (see README example).

- Tooling files (e.g. `vite.config.ts`, top-level `scripts/*.ts`) are linted, but ESLint runs them without type-aware rules by design — the flat config omits `parserOptions.project` for these files. If you need type-aware linting for those files, add a root `tsconfig.json` that includes them and update `eslint.config.js` accordingly.

## Build / dev / test workflows (explicit commands)

- Install deps: `npm install` (repository uses npm; devDependencies are listed in `package.json`).
- Dev server + watch: `npm run start` — runs the bundler watch and a static `http-server` opening `test/browser.html`. Useful for quick visual debugging.
- Build (dev): `npm run build:dev` — Vite build (unminified).
- Build (prod): `npm run build:dts && npm run build:prod` or `npm run build` which runs the `build:*` tasks in parallel; `BUILD=production` environment triggers minification.
- Type definitions: `npm run build:dts` runs `tsc --project src/tsconfig-dts.json` (dts build uses a separate tsconfig in `src`).
 - Lint: `npm run lint` — runs `eslint` (this is the fast, canonical lint check used for development and CI validation).

 - Test: `npm test` — runs `ts-node test/visual-test.ts`. This is a visual-regression style test that:

 	- starts a Vite dev server rooted at `test/` (default port 7357)
 	- launches Puppeteer and opens `test/browser.html`
 	- takes screenshots into `test/__screenshots__` (baseline files are `s-<slug>.png`)
 	- compares new screenshots with saved baselines using `looks-same` and writes diffs to `test/__screenshots__` when differences are found
 	- exits with non-zero status when visual diffs are detected

 	Options:

 	- `--accept` — run `npm test -- --accept` to accept the new screenshots as the new baselines (overwrites saved images)
 	- `--only-server` — run `npm test -- --only-server` to only start the static server (useful for manual debugging in a browser)

	Note: Because `npm test` now runs the heavier visual test, use `npm run lint` for quick CI-style checks and local prepublish linting. The repository still contains some Vitest-based experiments (run with `npm run test-vitest`); they are incomplete and should be treated as experimental — ignore them for CI/publishing.
- Packaging helpers: after build, `npm run assets` will append versions and create zip artifacts.

Notes: CI or prepublish steps call `npm test` (see `prepublishOnly`), so ensure lint passes before publishing.

## Editing guidance & examples

- Small behavior changes: prefer editing `controller.ts` (logic) and `view.ts` (rendering) together. Keep controller/view plumbing: controller creates `PluginView` and passes `onSelectItem` callback.
- Adding config options: add parsing in `accept(...params)` inside `src/plugin.ts` using `parseRecord(...)` (look how `maxHeight` is parsed). Keep acceptance checks defensive (null returns when invalid).
- Changing CSS: update `src/sass/plugin.scss`; the bundler (Vite) compiles and inlines it. To preview styles, run `npm run start` and edit SASS; watch tasks are already configured (`watch:sass`).

## Integration points & dependencies

- Peer dependency: `@arijs/tweakpane` (consumer must provide it). The plugin code uses `@arijs/tweakpane-core` at build time.
- Bundling: the package outputs an ESM file to `dist/` (name derived in `vite.config.ts` and `scripts/dist-name.js`).

## When in doubt — concrete pointers

- If you need to change the external value contract, edit `src/plugin.ts` first and update `binding.reader`/`binding.writer` and `accept(...)` accordingly.
- For DOM/UX tweaks, edit `src/view.ts`. The render functions are `buildTree_`, `renderTreeLevel_`, `renderTreeNode_`, and `renderTreeOption_`.
- For lifecycle or value propagation changes, edit `src/controller.ts`.

## After making changes

1. Run `npm run build:dev` to ensure the bundle compiles.
2. Run `npm test` (eslint) to satisfy prepublish checks.
3. Use `npm run start` and open the served `test/browser.html` to verify visual/interactive behavior.

## Troubleshooting — visual tests & Puppeteer

If `npm test` (the visual test) fails or behaves unexpectedly, here are quick debugging steps and common fixes:

- Check basics:
	- Run `npm install` to ensure `puppeteer` and other deps are installed and the Chromium binary was downloaded (look under `node_modules/puppeteer/.local-chromium`).
	- Try `npm test -- --only-server` to start the dev server only, then open `http://localhost:7357/test/browser.html` in your browser to inspect the page manually.

- If Puppeteer fails to launch on CI or headless environments:
	- Ensure the environment has required system libraries for Chromium (for Linux: libnss3, libx11, libxcomposite, libxrandr, libxss, libasound2, fonts, etc.).
	- Prefer using the official CI runner images that include Chrome (for GitHub Actions use ubuntu-latest which has Chrome installed) or install Chrome/Chromium in your workflow and point Puppeteer to it via `PUPPETEER_EXECUTABLE_PATH`.
	- Try running Puppeteer with sandboxing disabled if the runner requires it (example: `--no-sandbox --disable-setuid-sandbox`). If needed, run tests inside Docker with the proper flags or configure your CI to allow Chromium to run.

- Debugging mismatches:
	- Baseline screenshots are stored in `test/__screenshots__/s-<slug>.png`. New runs save `s-<slug>-new.png` and diffs are saved as `s-<slug>-diff.png` when differences appear.
	- Use `npm test -- --accept` to accept new screenshots when UI changes are intentional.

- Flaky results and timing:
	- The visual test is sensitive to fonts, rendering differences, and network resources. Run the server locally (`--only-server`) and open the page to check fonts/resources.
	- If tests fail intermittently, add small waits in the page or improve stable selectors/resources in `test/browser.html` if you maintain that test page.

Note: The repository intentionally keeps some experimental Vitest tests (`npm run test-vitest`). They are not used in CI and can be ignored for publishing.
If any section is unclear or you'd like examples expanded (unit test patterns, API surface with `@arijs/tweakpane-core`, or CI steps), tell me which part and I will iterate.
