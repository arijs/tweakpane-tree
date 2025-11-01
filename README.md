# tweakpane-tree

A tree input plugin for [Tweakpane](https://tweakpane.github.io/docs/) that allows users to select items from a hierarchical tree structure.

## Features

- **Hierarchical Tree Structure**: Support for arbitrarily nested tree nodes
- **Native HTML Elements**: Uses `<details>` and `<summary>` elements for native expand/collapse behavior
- **Type-Safe**: Fully typed TypeScript implementation
- **Path Tracking**: Returns complete path information including indices, values, and leaf value

## Installation

### Browser

```html
<script type="module">
  import {Pane} from 'tweakpane';
  import * as TweakpaneTreePlugin from 'tweakpane-plugin-tree';

  const pane = new Pane();
  pane.registerPlugin(TweakpaneTreePlugin);
</script>
```

### Package

```js
import {Pane} from 'tweakpane';
import * as TreePlugin from 'tweakpane-plugin-tree';

const pane = new Pane();
pane.registerPlugin(TreePlugin);
```

## Usage

```js
const params = {
  selectedItem: {
    treePathIndices: [],
    treePathValues: [],
    leafValue: undefined
  }
};

pane.addBinding(params, 'selectedItem', {
  view: 'tree',
  children: [
    {
      label: 'Colors',
      children: [
        { label: 'Red', value: '#ff0000' },
        { label: 'Green', value: '#00ff00' },
        { label: 'Blue', value: '#0000ff' }
      ]
    },
    {
      label: 'Sizes',
      children: [
        { label: 'Small', value: 10 },
        { label: 'Medium', value: 20 },
        { label: 'Large', value: 30 }
      ]
    }
  ]
}).on('change', (ev) => {
  console.log(ev.value);
  // {
  //   treePathIndices: [0, 1],
  //   treePathValues: [null, '#00ff00'],
  //   leafValue: '#00ff00'
  // }
});
```

## Tree Structure

### Tree Options (Leaf Nodes)

Leaf nodes represent selectable items:

```typescript
{
  label: string;    // Display text
  value?: unknown;  // Optional value associated with this item
}
```

### Tree Nodes (Branch Nodes)

Branch nodes contain children and can optionally be selectable themselves:

```typescript
{
  label: string;           // Display text
  children: TreeChildren;  // Array of child options or nodes
  value?: unknown;         // Optional value associated with this node
}
```

## Bound Value

When you bind a tree input, the external value has the following structure:

```typescript
{
  treePathIndices: number[];  // Array of indices representing the path from root to selected item
  treePathValues: unknown[];  // Array of values at each level of the path
  leafValue: unknown;         // The value of the selected leaf item
}
```

### Reading and Writing

- **Reading**: Only the `treePathIndices` property is read from the bound object
- **Writing**: All three properties (`treePathIndices`, `treePathValues`, `leafValue`) are written to the bound object

## Example

See the [test page](test/browser.html) for a complete working example.

## Screenshots

### Initial State
![Initial State](https://github.com/user-attachments/assets/37c8df16-2458-4226-a930-5fa19b52fb23)

### Expanded Tree
![Expanded Tree](https://github.com/user-attachments/assets/d8deba4f-9a71-4e28-a3f5-e0e6b9dae463)

### Nested Selection
![Nested Selection](https://github.com/user-attachments/assets/712ac423-eddd-465e-bb9e-88b535a4fe25)

## Build / dev / test workflows

- Install deps: `npm install` (repository uses npm; devDependencies are listed in `package.json`).
- Dev server: `npm run dev` or `npm start` — runs the Vite dev server and opens `test/browser.html` for quick visual debugging.
- Build (dev): `npm run build:dev` — Vite build (unminified output).
- Build (prod): `npm run build:prod` — Vite build in production mode (minified). The convenience script `npm run build` runs both `build:dts` and Vite builds in parallel.
- Type definitions: `npm run build:dts` runs `tsc --project src/tsconfig-dts.json` to emit `.d.ts` files into `dist/types`.
- Lint/test: `npm test` — runs ESLint (this project treats lint as the unit test).
- Packaging helpers: after build, `npm run assets` will append versions and create zip artifacts.

Notes: The CSS is compiled from `src/sass/plugin.scss` and inlined into the `css` export by the bundler at build time (see `vite.config.ts`). CI and prepublish steps call `npm test` (see `prepublishOnly`), so ensure lint passes before publishing.

## License

MIT
