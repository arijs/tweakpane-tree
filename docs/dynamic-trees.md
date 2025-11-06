
# Dynamic Trees — Feature Summary

This document summarizes the recent change that enables dynamic trees for the `tweakpane-tree` plugin.

## What changed

- The plugin now accepts a dynamic tree structure embedded in the bound value itself. The `TreeValue` type in `src/plugin.ts` gained an optional `tree?: TreeChildren | undefined` property. When present, this tree is used to render the control.
- `PluginInputParams.children` is now optional. If the bound value provides a `tree`, params may omit `children` and the plugin will still accept the input.
- The `binding.reader` copies a `tree` from the external value into the internal value (when present). The `binding.writer` writes `tree` back to the target object when the internal value includes it.
- The controller/view prefer the dynamic `tree` from the current bound value (via `value.rawValue.tree`) and fall back to the `children` param when `tree` is absent.
- The view rebuilds when `value.rawValue.tree` changes, so runtime updates to the dynamic tree are reflected in the UI.

## Files changed

- `src/plugin.ts` — add `tree?: TreeChildren | undefined` to `TreeValue`, make `children` optional, update `accept`, `binding.reader`, `binding.writer`, and controller creation logic.
- `src/view.ts` — use `value.rawValue.tree` at init and rebuild the tree when `value.rawValue.tree` changes.

## Implementation details

- Accept logic: `accept()` now allows `params.children` to be missing if the initial external value contains a `tree` array. If neither is present, the plugin denies the input.
- Reader/writer: `binding.reader()` will populate the internal value with `tree` when present on the external value; `binding.writer()` includes `tree` when writing out the value.
- Controller/view: the controller passes the dynamic tree (from `value.rawValue.tree`) to the `PluginController`/`PluginView`, and `PluginView` listens to value changes to rebuild when the tree changes.
- The runtime behavior is covered by the view's `value` change listener, which rebuilds the UI when a new `tree` array is provided in `value.rawValue`.

## How to test manually

1. Bind the plugin input to an object shaped like this (example):

```ts
{
	treePathIndices: [0, 1],
	treePathValues: ['A','B'],
	leafValue: 'leafB',
	tree: [
		{ label: 'Group A', children: [{ label: 'A.1', value: 1 }, { label: 'A.2', value: 2 }] },
		{ label: 'Group B', value: 'leafB' }
	]
}
```

2. The control should render using the `tree` provided above instead of the `children` declared in plugin params.

3. Update the bound value later (via the binding target) and include a different `tree`. The view should rebuild and display the new structure.

4. If the bound value omits `tree`, the plugin should fall back to `children` from params and behave as before.

## Testing the dynamic trees (browser demo)

This repository includes a lightweight demo in `test/browser.html` that exercises the dynamic-tree behavior and provides convenient controls for interactive testing.

What the demo contains

- Two tabs: "Static Tree" and "Dynamic Tree". The Static tab shows the original (param-based) example. The Dynamic tab hosts a second pane instance that reads the `tree` array from the bound value and demonstrates runtime updates.
- A control panel below the dynamic tree with two text fields (Label and Value) and five buttons:
	- Insert before selected — inserts a new item before the currently selected option (or at the front when nothing is selected).
	- Append to end of tree — appends a new item to the root of the dynamic tree.
	- Insert as child — inserts a new child under the currently selected item. If the selected item is a leaf (TreeOption) it will be converted to a TreeNode (its `value` is removed and a `children` array is added); when creating a node, if the value input is empty the new child will be a TreeNode (empty children array).
	- Remove selected — removes the currently selected item from the tree and clears the selection.
	- Update selected — updates the selected item's label and value; if the value field is empty the item is converted (or kept) as a TreeNode with an empty `children` array.

How the demo updates the view

- The dynamic pane in the demo binds to an object that contains a `tree` array on the bound value (this mirrors the `TreeValue.tree` contract described above).
- When a control mutates the `tree` array, the demo attempts to notify the plugin view in two ways (to maximize compatibility across builds):
	1. Preferred: call `treeApi.value.emitter.emit('change', treeApi.value.rawValue)` to signal a value change. The view listens for changes on the bound `Value` object and will rebuild when `rawValue.tree` has been replaced.
 2. Fallback: if the binding's emitter API is not available in the environment, the demo will recreate the pane/binding to force a rebuild. This is less efficient but robust for manual testing.

Assertions and manual checks

- Visual rebuild: After inserting/updating/removing nodes, the tree's DOM should update to match the `tree` structure visible in the demo's JSON area.
- Selection markers: the view sets a `data-tree-selected="true"` attribute on the selected element. Use the browser inspector to verify the attribute moves as selection changes.
- Stable attributes for testing: nodes and options expose stable attributes used by tests and by the view's diffing logic:
	- `data-tree-node` on `<details>` (index for that level)
	- `data-tree-summary` on `<summary>` (label text)
	- `data-tree-children-path` on the children container (JSON path)
	- `data-tree-option` on option `<div>` (label text)
	- `data-tree-path` on both options and summary elements (JSON path)

Verifying DOM reuse and reordering

- The diff algorithm in the view tries to reuse existing DOM nodes when rebuilding a level. To see reuse in action:
	1. Expand a few nodes in the tree.
	2. Use the demo to insert or reorder items in the same parent level but keep the same labels for some items.
	3. Inspect the node elements in the DOM — nodes whose summary text matches an existing `<summary>` are reused (the view preserves element identity and re-attaches attributes/listeners). Reordered nodes are moved with `insertBefore` so their DOM identity remains the same while the tree order changes.

Developer commands to run the demo and tests

- Start the dev server and open the demo page (recommended for interactive work):

```bash
npm run start
# then open http://localhost:7357/test/browser.html
```

- Run the visual regression test suite (captures screenshots and compares to baselines):

```bash
npm test
# Use -- --accept to accept new baselines when UI changes are intentional
```

- Quick lint check (recommended before publishing):

```bash
npm run lint
```

Notes and troubleshooting

- If the view doesn't rebuild after mutating the `tree` array, ensure the demo's code either emits a `change` event on the binding value or rebinds the input (the demo attempts both). The `PluginView` listens for `change` events on the bound `Value` and will rebuild when `rawValue.tree` is present and differs from the current `children`.
- If screenshots from `npm test` fail, use `npm test -- --only-server` and open `test/browser.html` in a real browser to debug layout or resource issues.

Follow-ups

- Consider adding unit tests that simulate value changes and assert that the view rebuilds and that DOM reuse/reordering behave as expected.
- Consider adding a small API surface on the binding to request a tree rebuild explicitly (e.g., `treeApi.requestRebuild()`), which would avoid the emitter/fallback dance in demos.

## Follow-ups / recommendations

- Consider using a deep-equality check before rebuilding the tree to avoid unnecessary re-renders when the tree object is replaced but contents didn't change.
- Add unit tests:
	- Test `accept()` when params omit `children` but value includes `tree`.
	- Test that `binding.reader()` carries `tree` into the internal value.
	- Test that the view rebuilds when `value.rawValue.tree` changes.
- Update README/docs to mention `tree` in `TreeValue` as an alternative to static `children` params.

## Final status

The code changes have been applied to `src/plugin.ts` and `src/view.ts`. Typechecking couldn't be completed in this environment because TypeScript is not installed; see verification steps above to run locally.

If you want, I can add tests and a deep-equality guard, or install TypeScript and run a check in this workspace.

