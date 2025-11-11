import { expect, test } from 'vitest'
// import { render } from './render-element/index.js'
import { getByText } from '@testing-library/dom'
// @ts-expect-error
import { renderTreePane } from './renderTreePane.js'

const elementLocator = (parent: Element | null, selector: string) => (parent ?? document).querySelector(selector) as HTMLElement | SVGElement | null

const elementLocatorAll = (parent: Element | null, selector: string) => (parent ?? document).querySelectorAll(selector) as NodeListOf<HTMLElement | SVGElement>

test('renders tree correctly', async () => {
	const { wrapper, pane, treeApi } = renderTreePane()

	expect(wrapper).toBeDefined()
	expect(pane).toBeDefined()
	expect(treeApi).toBeDefined()

	// render(wrapper)
	document.body.appendChild(wrapper)

	// page.elementLocator('body').element().appendChild(wrapper)

	// const { elementLocator } = screen

	const label = getByText(wrapper, 'Selected Item:')

	await expect.element(label).toHaveTextContent('Selected Item:')

	const paneValue = elementLocator(null, '.tp-lblv_v')
	const paneTree = elementLocator(paneValue, '.tp-treev')
	const treeCont = elementLocator(paneTree, '.tp-treev_container')
	const rootBranches = elementLocatorAll(paneTree, '.tp-treev_container > details.tp-treev_node')
	const rootOptions = elementLocatorAll(paneTree, '.tp-treev_container > .tp-treev_option')
	await (await expect.element(paneValue)).toContain(paneTree)
	await (await expect.element(paneTree)).toContain(treeCont)
	await expect(rootBranches).toHaveLength(3) // Colors, Sizes, Fonts
	await expect(rootOptions).toHaveLength(1) // Standalone

	// await expect.element(wrapper).toMatchScreenshot('tree-initial')
})
