import {
	BaseInputParams,
	BindingTarget,
	CompositeConstraint,
	createPlugin,
	InputBindingPlugin,
	parseRecord,
} from '@arijs/tweakpane-core'

import {PluginController} from './controller.js'

// Tree option (leaf node)
export interface TreeOption {
	label: string
	value?: unknown
}

// Tree node with children (branch node)
export interface TreeNode {
	label: string
	children: TreeChildren
	value?: unknown
	initialOpen?: boolean | undefined
}

// Children can be a mix of options and tree nodes
export type TreeChildren = (TreeOption | TreeNode)[]

export interface TreeActive {
	// Active path mirrors the currently "active" node (any clicked node,
	// including nodes without a value). These are updated on any click of a
	// node/option and are written back to the bound object by the plugin.
	activePathIndices: number[]
	activePathValues: unknown[]
	activeLeafValue: unknown
}

// The external value that will be bound
export interface TreeValue {
	selectedPathIndices: number[]
	selectedPathValues: unknown[]
	selectedLeafValue: unknown
	// Optional dynamic tree definition. If provided, use this to render the tree
	// instead of the static `children` from params.
	tree?: TreeChildren | undefined
}

export interface PluginInputOnClickItemParamsBase {
	ev: Event
	item: TreeNode | TreeOption
	hasValue: boolean
	isTreeNode: boolean
	isEventTargetSummary: boolean
	preventDefault: () => void
	select: () => void
}

export interface PluginInputOnClickItemParams
	extends PluginInputOnClickItemParamsBase {
	handleDefault: () => void
}

export interface PluginInputParams extends BaseInputParams {
	// `children` may be omitted when the bound `TreeValue` already supplies
	// a dynamic `tree` property.
	children?: TreeChildren
	view: 'tree'
	maxHeight?: string | undefined
	onClickItem: ((params: PluginInputOnClickItemParams) => void) | undefined
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
			!('selectedPathIndices' in exValue) ||
			!('selectedPathValues' in exValue) ||
			!('selectedLeafValue' in exValue)
		) {
			// Return null to deny the user input
			return null
		}

		const value = exValue as TreeValue
		if (
			!Array.isArray(value.selectedPathIndices) ||
			!Array.isArray(value.selectedPathValues)
		) {
			return null
		}

		// If the external value doesn't provide a dynamic tree, ensure the
		// params include `children`. If the external value includes `tree`
		// we accept params without `children`.
		const exVal = exValue as TreeValue
		const hasDynamicTree =
			typeof exVal === 'object' &&
			exVal !== null &&
			'tree' in exVal &&
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			Array.isArray((exVal as any).tree)

		// Parse parameters object
		const result = parseRecord<PluginInputParams>(params, (p) => ({
			// `view` option may be useful to provide a custom control for primitive values
			view: p.required.constant('tree'),
			// children is optional here; we'll validate presence below when
			// the external value doesn't provide a dynamic tree.
			children: p.optional.custom<TreeChildren>(() => {
				return params.children as TreeChildren
			}),
			maxHeight: p.optional.string,
			onClickItem: p.optional.custom((v) => {
				if (v instanceof Function) {
					return v as (params: {
						item: TreeNode | TreeOption
						preventDefault: () => void
						select: () => void
					}) => void
				}
			}),
		}))
		if (!result) {
			return null
		}

		// If there's no dynamic tree on the external value, ensure params
		// provided `children`.
		if (
			!hasDynamicTree &&
			(!result.children || !Array.isArray(result.children))
		) {
			return null
		}

		// Return a typed value and params to accept the user input
		return {
			initialValue: value,
			params: result,
		}
	},

	binding: {
		reader(_args) {
			return (exValue: unknown): TreeValue => {
				// Convert an external unknown value into the internal value
				// Only read the selectedPathIndices property as per requirements
				if (
					typeof exValue === 'object' &&
					exValue !== null &&
					'selectedPathIndices' in exValue
				) {
					const value = exValue as TreeValue
					// Safely extract potentially-typed fields from the unknown external value
					// const activeFromValue = (
					// 	value as unknown as {activePathIndices?: number[]}
					// ).activePathIndices
					const treeFromValue = (value as unknown as {tree?: unknown}).tree as
						| TreeChildren
						| undefined
					return {
						selectedPathIndices: Array.isArray(value.selectedPathIndices)
							? [...value.selectedPathIndices]
							: [],
						selectedPathValues: [],
						selectedLeafValue: undefined,
						// activePathIndices: Array.isArray(activeFromValue)
						// 	? [...activeFromValue]
						// 	: [],
						// activePathValues: [],
						// activeLeafValue: undefined,
						// carry through a dynamic tree when present so the
						// controller can render it
						tree: Array.isArray(treeFromValue) ? [...treeFromValue] : undefined,
					}
				}
				return {
					selectedPathIndices: [],
					selectedPathValues: [],
					selectedLeafValue: undefined,
					// activePathIndices: [],
					// activePathValues: [],
					// activeLeafValue: undefined,
				}
			}
		},

		constraint(_args) {
			// No constraints for tree values
			return new CompositeConstraint([])
		},

		writer(_args) {
			return (target: BindingTarget, inValue: TreeValue) => {
				// Write all properties to the target. Include `tree` only when
				// present on the internal value.
				const out: Record<string, unknown> = {
					selectedPathIndices: [...inValue.selectedPathIndices],
					selectedPathValues: [...inValue.selectedPathValues],
					selectedLeafValue: inValue.selectedLeafValue,
					// activePathIndices: [...inValue.activePathIndices],
					// activePathValues: [...inValue.activePathValues],
					// activeLeafValue: inValue.activeLeafValue,
				}
				if (inValue.tree !== undefined) {
					out.tree = Array.isArray(inValue.tree)
						? [...inValue.tree]
						: inValue.tree
				}
				target.write(out)
			}
		},
	},

	controller(args) {
		// Create a controller for the plugin. If the bound value supplies a
		// dynamic `tree`, use it; otherwise fall back to the parsed params.
		// Try to read a dynamic tree from the current bound value's rawValue
		// (Value<T> exposes the current raw value as `rawValue`). Use `any`
		// here to avoid a type mismatch with the Value<T> wrapper.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const dynamicTree = (args.value as any)?.rawValue?.tree
		const children = dynamicTree ?? args.params.children
		return new PluginController(args.document, {
			value: args.value,
			viewProps: args.viewProps,
			children: children as TreeChildren,
			maxHeight: args.params.maxHeight,
			onClickItem: args.params.onClickItem,
		})
	},
})
