import {ClassName, Value, View, ViewProps} from '@arijs/tweakpane-core'

import {TreeChildren, TreeNode, TreeOption, TreeValue} from './plugin.js'

interface Config {
	value: Value<TreeValue>
	viewProps: ViewProps
	children: TreeChildren
	onSelectItem: (
		pathIndices: number[],
		pathValues: unknown[],
		leafValue: unknown,
	) => void
	maxHeight?: string
}

// Create a class name generator from the view name
// ClassName('tree') will generate a CSS class name like `tp-treev`
const className = ClassName('tree')

// Helper function to check if an item is a tree node (has children)
function isTreeNode(item: TreeOption | TreeNode): item is TreeNode {
	return 'children' in item && Array.isArray(item.children)
}

// Custom view class should implement `View` interface
export class PluginView implements View {
	public readonly element: HTMLElement
	private value_: Value<TreeValue>
	private children_: TreeChildren
	private onSelectItem_: (
		pathIndices: number[],
		pathValues: unknown[],
		leafValue: unknown,
	) => void

	constructor(doc: Document, config: Config) {
		// Create a root element for the plugin
		this.element = doc.createElement('div')
		this.element.classList.add(className())
		// Bind view props to the element
		config.viewProps.bindClassModifiers(this.element)

		// Apply maxHeight if provided
		if (config.maxHeight !== undefined) {
			this.element.style.maxHeight = config.maxHeight
			this.element.style.overflow = 'auto'
		}

		// Receive the bound value from the controller
		this.value_ = config.value
		// Handle 'change' event of the value
		this.value_.emitter.on('change', this.onValueChange_.bind(this))

		// Store children and callback
		this.children_ = config.children
		this.onSelectItem_ = config.onSelectItem

		// Build the tree
		this.buildTree_()

		config.viewProps.handleDispose(() => {
			// Called when the view is disposing
		})
	}

	private buildTree_(): void {
		// Clear existing content
		this.element.innerHTML = ''

		// Build tree structure
		const treeContainer = this.element.ownerDocument.createElement('div')
		treeContainer.classList.add(className('container'))

		this.renderTreeLevel_(
			treeContainer,
			this.children_,
			[],
			[],
			this.element.ownerDocument,
		)

		this.element.appendChild(treeContainer)
	}

	private renderTreeLevel_(
		container: HTMLElement,
		items: TreeChildren,
		pathIndices: number[],
		pathValues: unknown[],
		doc: Document,
	): void {
		items.forEach((item, index) => {
			if (isTreeNode(item)) {
				// Render a tree node with <details> and <summary>
				this.renderTreeNode_(
					container,
					item,
					index,
					pathIndices,
					pathValues,
					doc,
				)
			} else {
				// Render a leaf option
				this.renderTreeOption_(
					container,
					item,
					index,
					pathIndices,
					pathValues,
					doc,
				)
			}
		})
	}

	private renderTreeNode_(
		container: HTMLElement,
		node: TreeNode,
		index: number,
		pathIndices: number[],
		pathValues: unknown[],
		doc: Document,
	): void {
		const details = doc.createElement('details')
		details.classList.add(className('node'))

		const summary = doc.createElement('summary')
		summary.classList.add(className('summary'))
		summary.textContent = node.label

		// If the node itself has a value, make it selectable
		if ('value' in node && node.value !== undefined) {
			summary.addEventListener('click', (e) => {
				// Only handle the label click, not the disclosure triangle
				const target = e.target as HTMLElement
				if (target.tagName === 'SUMMARY') {
					e.preventDefault()
					const newPathIndices = [...pathIndices, index]
					const newPathValues = [...pathValues, node.value]
					this.onSelectItem_(newPathIndices, newPathValues, node.value)
				}
			})
			summary.classList.add(className('selectable'))
		}

		details.appendChild(summary)

		// Render children in a nested container
		const childContainer = doc.createElement('div')
		childContainer.classList.add(className('children'))

		const newPathIndices = [...pathIndices, index]
		const newPathValues = [...pathValues, node.value]

		this.renderTreeLevel_(
			childContainer,
			node.children,
			newPathIndices,
			newPathValues,
			doc,
		)

		details.appendChild(childContainer)
		container.appendChild(details)
	}

	private renderTreeOption_(
		container: HTMLElement,
		option: TreeOption,
		index: number,
		pathIndices: number[],
		pathValues: unknown[],
		doc: Document,
	): void {
		const optionElem = doc.createElement('div')
		optionElem.classList.add(className('option'))
		optionElem.textContent = option.label

		optionElem.addEventListener('click', () => {
			const newPathIndices = [...pathIndices, index]
			const newPathValues = [...pathValues, option.value]
			this.onSelectItem_(newPathIndices, newPathValues, option.value)
		})

		container.appendChild(optionElem)
	}

	private onValueChange_(): void {
		// Could update visual selection state here if needed
		// For now, we'll keep it simple
	}
}
