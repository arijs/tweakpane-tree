import {Controller, Value, ViewProps} from '@tweakpane/core';

import {TreeChildren, TreeValue} from './plugin.js';
import {PluginView} from './view.js';

interface Config {
	value: Value<TreeValue>;
	viewProps: ViewProps;
	children: TreeChildren;
}

// Custom controller class should implement `Controller` interface
export class PluginController implements Controller<PluginView> {
	public readonly value: Value<TreeValue>;
	public readonly view: PluginView;
	public readonly viewProps: ViewProps;
	public readonly children: TreeChildren;

	constructor(doc: Document, config: Config) {
		this.onSelectItem_ = this.onSelectItem_.bind(this);

		// Receive the bound value from the plugin
		this.value = config.value;

		// and also view props
		this.viewProps = config.viewProps;
		this.viewProps.handleDispose(() => {
			// Called when the controller is disposing
		});

		// Store the tree children
		this.children = config.children;

		// Create a custom view
		this.view = new PluginView(doc, {
			value: this.value,
			viewProps: this.viewProps,
			children: this.children,
			onSelectItem: this.onSelectItem_,
		});
	}

	private onSelectItem_(
		pathIndices: number[],
		pathValues: unknown[],
		leafValue: unknown,
	): void {
		// Update the value when user selects an item
		this.value.rawValue = {
			treePathIndices: pathIndices,
			treePathValues: pathValues,
			leafValue: leafValue,
		};
	}
}
