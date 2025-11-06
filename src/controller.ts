import {Controller, Value, ViewProps} from '@arijs/tweakpane-core'

import {TreeChildren, TreeValue} from './plugin.js'
import {PluginView} from './view.js'

interface Config {
	value: Value<TreeValue>
	viewProps: ViewProps
	children: TreeChildren
	maxHeight?: string
}

// Custom controller class should implement `Controller` interface
export class PluginController implements Controller<PluginView> {
	public readonly value: Value<TreeValue>
	public readonly view: PluginView
	public readonly viewProps: ViewProps
	public readonly children: TreeChildren

	constructor(doc: Document, config: Config) {
		this.onSelectItem_ = this.onSelectItem_.bind(this)

		// Receive the bound value from the plugin
		this.value = config.value

		// and also view props
		this.viewProps = config.viewProps
		this.viewProps.handleDispose(() => {
			// Called when the controller is disposing
		})

		// Store the tree children
		this.children = config.children

		// Create a custom view
		this.view = new PluginView(doc, {
			value: this.value,
			viewProps: this.viewProps,
			children: this.children,
			onSelectItem: this.onSelectItem_,
			maxHeight: config.maxHeight,
		})
	}

	private onSelectItem_(
		pathIndices: number[],
		pathValues: unknown[],
		leafValue: unknown,
	): void {
		// Update the value when user selects an item
		// Preserve an existing dynamic `tree` property when present on the
		// bound raw value so selecting an item doesn't drop the tree data.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const currentRaw = this.value.rawValue as any
		const newRaw: any = {
			treePathIndices: pathIndices,
			treePathValues: pathValues,
			leafValue: leafValue,
		}
		if (currentRaw && Array.isArray(currentRaw.tree)) {
			newRaw.tree = currentRaw.tree
		}
		this.value.rawValue = newRaw
	}
}
