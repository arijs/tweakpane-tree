import {ClassName, Value, View, ViewProps} from '@arijs/tweakpane-core'

import {TreeChildren, TreeNode, TreeOption, TreeValue} from './plugin.js'

interface Config {
	value: Value<TreeValue>
	viewProps: ViewProps
	children: TreeChildren
	onSelectItem: (
		pathIndices: number[],
		pathValues: unknown[],
		selectedLeafValue: unknown,
	) => void
	// onActiveItem: (
	// 	pathIndices: number[],
	// 	pathValues: unknown[],
	// 	activeLeafValue: unknown,
	// ) => void
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
		selectedLeafValue: unknown,
	) => void
	// private onActiveItem_: (
	// 	pathIndices: number[],
	// 	pathValues: unknown[],
	// 	activeLeafValue: unknown,
	// ) => void
	private abortListeners: AbortController

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
		this.abortListeners = new AbortController()

		// Receive the bound value from the controller
		this.value_ = config.value
		// Handle 'change' event of the value
		this.value_.emitter.on('change', this.onValueChange_.bind(this))

		// Store children and callback
		// If the bound value provides a dynamic tree, prefer it over the
		// static `children` passed via params.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const initialRaw = this.value_.rawValue as any
		if (initialRaw && Array.isArray(initialRaw.tree)) {
			this.children_ = initialRaw.tree
		} else {
			this.children_ = config.children
		}
		this.onSelectItem_ = config.onSelectItem
		// this.onActiveItem_ = config.onActiveItem

		// Build the tree
		this.buildTree_()

		// Reflect initial value selection visually
		this.onValueChange_()

		config.viewProps.handleDispose(() => {
			// Called when the view is disposing
		})
	}

	private buildTree_(): void {
		// Don't naively clear DOM — try to reuse existing structure.
		// Reset listeners so newly attached listeners use a fresh AbortSignal.
		this.abortListeners.abort()
		this.abortListeners = new AbortController()

		const doc = this.element.ownerDocument
		const treeContainer = this.getOrBuildTreeContainer_(doc)

		this.renderTreeLevel_(treeContainer, this.children_, [], [], doc)
	}

	/**
	 * Return an existing direct child that looks like the tree container
	 * (matching nodeName and containing the container class), or create a new
	 * one. If an existing container is found, remove any other siblings. If
	 * not found, clear the parent and create a fresh container.
	 */
	private getOrBuildTreeContainer_(doc: Document): HTMLElement {
		const desiredClass = className('container')
		const children = Array.from(this.element.children)
		const existing = children.find(
			(ch) => ch.nodeName === 'DIV' && ch.classList.contains(desiredClass),
		) as HTMLElement | undefined

		if (existing) {
			// Remove any other siblings so the tree root is stable and predictable
			children.forEach((ch) => {
				if (ch !== existing) {
					ch.remove()
				}
			})
			return existing
		}

		// No existing container found: clear and create a new one
		this.element.innerHTML = ''
		const treeContainer = doc.createElement('div')
		treeContainer.classList.add(desiredClass)
		this.element.appendChild(treeContainer)
		return treeContainer
	}

	private renderTreeLevel_(
		container: HTMLElement,
		items: TreeChildren,
		pathIndices: number[],
		pathValues: unknown[],
		doc: Document,
	): void {
		const signal = this.abortListeners.signal
		// Remaining starts as all direct children; we'll remove items from it
		const remaining: HTMLElement[] = Array.from(
			container.children,
		) as HTMLElement[]
		const built: HTMLElement[] = []

		items.forEach((item, index) => {
			const newPathIndices = [...pathIndices, index]
			// Both TreeOption and TreeNode expose an optional `value` property
			const newPathValues = [
				...pathValues,
				(item as TreeNode | TreeOption).value,
			]

			if (isTreeNode(item)) {
				// Find first <details> in remaining with the node class and matching
				// summary text content. Match direct <summary> child.
				const foundIndex = remaining.findIndex((el) => {
					if (
						el.nodeName !== 'DETAILS' ||
						!el.classList.contains(className('node'))
					) {
						return false
					}
					const sum = el.querySelector(':scope > summary') as HTMLElement | null
					return !!(sum && sum.textContent === item.label)
				})

				let details: HTMLElement
				if (foundIndex >= 0) {
					// Reuse existing element
					details = remaining.splice(foundIndex, 1)[0]
				} else {
					// Create a fresh details element (do not attach data attrs/listeners here)
					details = this.buildDetailsElement_(doc)
				}

				// Ensure stable attributes and classes are set/reset
				details.classList.add(className('node'))
				details.setAttribute('data-tree-node', String(index))

				let summary = details.querySelector(
					':scope > summary',
				) as HTMLElement | null
				if (!summary) {
					summary = doc.createElement('summary')
					summary.classList.add(className('summary'))
					details.insertBefore(summary, details.firstChild)
				}
				summary.classList.add(className('summary'))
				summary.setAttribute('data-tree-summary', String(item.label))
				summary.setAttribute('data-tree-path', JSON.stringify(newPathIndices))
				summary.textContent = item.label

				// Always attach an active callback when the summary is clicked.
				// If the node has a `value`, also treat the click as a selection
				// (prevent default toggle and call onSelect). For nodes without a
				// value allow the native toggle behavior to occur.
				if ('value' in item && item.value !== undefined) {
					summary.classList.add(className('selectable'))
				} else {
					summary.classList.remove(className('selectable'))
				}
				summary.addEventListener(
					'click',
					(e) => {
						const target = e.target as HTMLElement
						if (target.tagName === 'SUMMARY') {
							// Always notify about the active node
							// this.onActiveItem_(
							// 	newPathIndices,
							// 	newPathValues,
							// 	(item as TreeNode | TreeOption).value,
							// )
							if ('value' in item && item.value !== undefined) {
								// Selection: prevent native toggle and emit select
								e.preventDefault()
								this.onSelectItem_(newPathIndices, newPathValues, item.value)
							}
						}
					},
					{signal},
				)

				// Ensure child container exists and is used as the next parent
				let childContainer = details.querySelector(
					':scope > div.' + className('children'),
				) as HTMLElement | null
				if (!childContainer) {
					childContainer = doc.createElement('div')
					childContainer.classList.add(className('children'))
					details.appendChild(childContainer)
				}
				childContainer.setAttribute(
					'data-tree-children-path',
					JSON.stringify(newPathIndices),
				)

				// Insert/reorder into parent using the first remaining element as anchor
				const nextSibling = remaining[0] || null
				container.insertBefore(details, nextSibling)
				built.push(details)

				// Recurse for children
				this.renderTreeLevel_(
					childContainer,
					item.children,
					newPathIndices,
					newPathValues,
					doc,
				)
			} else {
				// Leaf option: find first matching element in remaining
				const foundIndex = remaining.findIndex((el) => {
					return (
						el.nodeName === 'DIV' &&
						el.classList.contains(className('option')) &&
						el.textContent === item.label
					)
				})

				let optionElem: HTMLElement
				if (foundIndex >= 0) {
					optionElem = remaining.splice(foundIndex, 1)[0]
				} else {
					optionElem = this.buildOptionElement_(doc, item.label)
				}

				optionElem.classList.add(className('option'))
				optionElem.textContent = item.label
				optionElem.setAttribute('data-tree-option', String(item.label))
				optionElem.setAttribute(
					'data-tree-path',
					JSON.stringify(newPathIndices),
				)
				optionElem.addEventListener(
					'click',
					() => {
						// Option click both makes the node active and selects it
						// this.onActiveItem_(newPathIndices, newPathValues, item.value)
						this.onSelectItem_(newPathIndices, newPathValues, item.value)
					},
					{signal},
				)

				const nextSibling = remaining[0] || null
				container.insertBefore(optionElem, nextSibling)
				built.push(optionElem)
			}
		})

		// Remove any leftover nodes that weren't matched
		remaining.forEach((el) => el.remove())
	}

	// Create a details element skeleton (no data attrs or listeners)
	private buildDetailsElement_(doc: Document): HTMLElement {
		const details = doc.createElement('details')
		details.classList.add(className('node'))
		const summary = doc.createElement('summary')
		summary.classList.add(className('summary'))
		details.appendChild(summary)
		const childContainer = doc.createElement('div')
		childContainer.classList.add(className('children'))
		details.appendChild(childContainer)
		return details
	}

	// Create an option element skeleton (no data attrs or listeners)
	private buildOptionElement_(doc: Document, label: string): HTMLElement {
		const optionElem = doc.createElement('div')
		optionElem.classList.add(className('option'))
		optionElem.textContent = label
		return optionElem
	}

	private onValueChange_(): void {
		// Update visual selection state based on the bound value.
		// Clear previous selection markers
		// const doc = this.element.ownerDocument
		this.element
			.querySelectorAll('[data-tree-selected="true"]')
			.forEach((el) => {
				el.removeAttribute('data-tree-selected')
			})

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const raw = this.value_.rawValue as any

		// If the raw value supplies a dynamic tree and it's different from
		// the currently rendered children, rebuild the tree.
		if (raw && Array.isArray(raw.tree) && raw.tree !== this.children_) {
			this.children_ = raw.tree
			this.buildTree_()
		}
		if (!raw || !Array.isArray(raw.selectedPathIndices)) {
			return
		}

		const pathStr = JSON.stringify(raw.selectedPathIndices)
		// Find the element with matching data-tree-path attribute and mark it
		const selector = `[data-tree-path='${pathStr}']`
		const el = this.element.querySelector(selector) as HTMLElement | null
		if (el) {
			el.setAttribute('data-tree-selected', 'true')
		}
	}
}
