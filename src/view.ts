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

		// Reflect initial value selection visually
		this.onValueChange_()

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

		// Add a stable data attribute for the node (helpful for visual tests)
		details.setAttribute('data-tree-node', String(index))

		// Prepare path info early so we can attach data attributes
		const newPathIndices = [...pathIndices, index]
		const newPathValues = [...pathValues, node.value]

		const summary = doc.createElement('summary')
		summary.classList.add(className('summary'))

		// Expose a stable data attribute for the summary label and path used by tests
		summary.setAttribute('data-tree-summary', String(node.label))
		summary.setAttribute('data-tree-path', JSON.stringify(newPathIndices))
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

		// Mark child container with path for easier querying
		childContainer.setAttribute('data-tree-children-path', JSON.stringify(newPathIndices))

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

		// Expose stable data attributes for tests
		optionElem.setAttribute('data-tree-option', String(option.label))
		optionElem.setAttribute('data-tree-path', JSON.stringify([...pathIndices, index]))

		optionElem.addEventListener('click', () => {
			const newPathIndices = [...pathIndices, index]
			const newPathValues = [...pathValues, option.value]
			this.onSelectItem_(newPathIndices, newPathValues, option.value)
		})

		container.appendChild(optionElem)
	}

	private onValueChange_(): void {
		// Update visual selection state based on the bound value.
		// Clear previous selection markers
		const doc = this.element.ownerDocument
		this.element.querySelectorAll('[data-tree-selected="true"]').forEach((el) => {
			el.removeAttribute('data-tree-selected')
		})

		const raw = this.value_.rawValue
		if (!raw || !Array.isArray(raw.treePathIndices)) {
			return
		}

		const pathStr = JSON.stringify(raw.treePathIndices)
		// Find the element with matching data-tree-path attribute and mark it
		const selector = `[data-tree-path='${pathStr}']`
		const el = this.element.querySelector(selector) as HTMLElement | null
		if (el) {
			el.setAttribute('data-tree-selected', 'true')
		}
	}
}
