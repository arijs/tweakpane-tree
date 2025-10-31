import {
	BaseInputParams,
	BindingTarget,
	CompositeConstraint,
	createPlugin,
	InputBindingPlugin,
	parseRecord,
} from '@arijs/tweakpane-core';

import {PluginController} from './controller.js';

// Tree option (leaf node)
export interface TreeOption {
	label: string;
	value?: unknown;
}

// Tree node with children (branch node)
export interface TreeNode {
	label: string;
	children: TreeChildren;
	value?: unknown;
}

// Children can be a mix of options and tree nodes
export type TreeChildren = (TreeOption | TreeNode)[];

// The external value that will be bound
export interface TreeValue {
	treePathIndices: number[];
	treePathValues: unknown[];
	leafValue: unknown;
}

export interface PluginInputParams extends BaseInputParams {
	children: TreeChildren;
	view: 'tree';
	maxHeight?: string | undefined;
}

// NOTE: JSDoc comments of `InputBindingPlugin` can be useful to know details about each property
//
// `InputBindingPlugin<In, Ex, P>` means...
// - The plugin receives the bound value as `Ex`,
// - converts `Ex` into `In` and holds it
// - P is the type of the parsed parameters
//
export const TreeInputPlugin: InputBindingPlugin<
	TreeValue,
	TreeValue,
	PluginInputParams
> = createPlugin({
	id: 'input-tree',

	// type: The plugin type.
	// - 'input': Input binding
	// - 'monitor': Monitor binding
	// - 'blade': Blade without binding
	type: 'input',

	accept(exValue: unknown, params: Record<string, unknown>) {
		// Check if exValue has the correct structure
		if (
			typeof exValue !== 'object' ||
			exValue === null ||
			!('treePathIndices' in exValue) ||
			!('treePathValues' in exValue) ||
			!('leafValue' in exValue)
		) {
			// Return null to deny the user input
			return null;
		}

		const value = exValue as TreeValue;
		if (
			!Array.isArray(value.treePathIndices) ||
			!Array.isArray(value.treePathValues)
		) {
			return null;
		}

		// Validate children parameter manually
		if (!params.children || !Array.isArray(params.children)) {
			return null;
		}

		// Parse parameters object
		const result = parseRecord<PluginInputParams>(params, (p) => ({
			// `view` option may be useful to provide a custom control for primitive values
			view: p.required.constant('tree'),
			children: p.required.custom<TreeChildren>(() => {
				return params.children as TreeChildren;
			}),
			maxHeight: p.optional.string,
		}));
		if (!result) {
			return null;
		}

		// Return a typed value and params to accept the user input
		return {
			initialValue: value,
			params: result,
		};
	},

	binding: {
		reader(_args) {
			return (exValue: unknown): TreeValue => {
				// Convert an external unknown value into the internal value
				// Only read the treePathIndices property as per requirements
				if (
					typeof exValue === 'object' &&
					exValue !== null &&
					'treePathIndices' in exValue
				) {
					const value = exValue as TreeValue;
					return {
						treePathIndices: Array.isArray(value.treePathIndices)
							? [...value.treePathIndices]
							: [],
						treePathValues: [],
						leafValue: undefined,
					};
				}
				return {
					treePathIndices: [],
					treePathValues: [],
					leafValue: undefined,
				};
			};
		},

		constraint(_args) {
			// No constraints for tree values
			return new CompositeConstraint([]);
		},

		writer(_args) {
			return (target: BindingTarget, inValue: TreeValue) => {
				// Write all three properties to the target
				target.write({
					treePathIndices: [...inValue.treePathIndices],
					treePathValues: [...inValue.treePathValues],
					leafValue: inValue.leafValue,
				});
			};
		},
	},

	controller(args) {
		// Create a controller for the plugin
		return new PluginController(args.document, {
			value: args.value,
			viewProps: args.viewProps,
			children: args.params.children,
			maxHeight: args.params.maxHeight,
		});
	},
});
