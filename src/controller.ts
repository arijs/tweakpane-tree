import {Controller, Value, ViewProps} from '@arijs/tweakpane-core'

import {PluginInputParams, TreeChildren, TreeValue} from './plugin.js'
import {PluginView} from './view.js'

interface Config {
	value: Value<TreeValue>
	viewProps: ViewProps
	children: TreeChildren
	maxHeight?: string | undefined
	onClickItem: PluginInputParams['onClickItem']
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
			// onActiveItem: this.onActiveItem_,
			maxHeight: config.maxHeight,
			onClickItem: config.onClickItem,
		})
	}

	private onSelectItem_(
		pathIndices: number[],
		pathValues: unknown[],
		selectedLeafValue: unknown,
	): void {
		// Update the value when user selects an item
		// Preserve an existing dynamic `tree` property when present on the
		// bound raw value so selecting an item doesn't drop the tree data.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const currentRaw = this.value.rawValue as any
		const newRaw: Partial<TreeValue> = {
			selectedPathIndices: pathIndices,
			selectedPathValues: pathValues,
			selectedLeafValue: selectedLeafValue,
		}
		if (currentRaw && Array.isArray(currentRaw.tree)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			;(newRaw as any).tree = currentRaw.tree
		}
		this.value.rawValue = newRaw as TreeValue
	}

	// private onActiveItem_(
	// 	pathIndices: number[],
	// 	pathValues: unknown[],
	// 	activeLeafValue: unknown,
	// ): void {
	// 	// Update only the active* properties, preserving selected* and tree
	// 	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	// 	const currentRaw = this.value.rawValue as any
	// 	const newRaw: Partial<TreeValue> = {
	// 		selectedPathIndices: pathIndices,
	// 		selectedPathValues: pathValues,
	// 		selectedLeafValue: activeLeafValue,
	// 	}
	// 	if (currentRaw && Array.isArray(currentRaw.tree)) {
	// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	// 		;(newRaw as any).tree = currentRaw.tree
	// 	}
	// 	// Preserve existing selected* values when present
	// 	if (currentRaw) {
	// 		if (Array.isArray(currentRaw.selectedPathIndices)) {
	// 			newRaw.selectedPathIndices = [...currentRaw.selectedPathIndices]
	// 		}
	// 		if (Array.isArray(currentRaw.selectedPathValues)) {
	// 			newRaw.selectedPathValues = [...currentRaw.selectedPathValues]
	// 		}
	// 		if ('selectedLeafValue' in currentRaw) {
	// 			newRaw.selectedLeafValue = currentRaw.selectedLeafValue
	// 		}
	// 	}
	// 	this.value.rawValue = newRaw as TreeValue

	// 	// Emit a custom 'active' event with the active info (payload can be anything)
	// 	// this.value.emitter.emit('active', {
	// 	// 	activePathIndices: pathIndices,
	// 	// 	activePathValues:  pathValues,
	// 	// 	activeLeafValue:   activeLeafValue,
	// 	// })
	// }
}
