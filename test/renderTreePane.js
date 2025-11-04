import {Pane} from '../node_modules/@arijs/tweakpane/dist/tweakpane.min.js'
import * as TweakpaneTreePlugin from '../dist/arijs-tweakpane-plugin-tree.js'

export function renderTreePane() {

	const wrapper = document.createElement('div')

	const container = document.createElement('div')
	container.style.setProperty('--tp-blade-value-width', 'auto');
	wrapper.appendChild(container)

	const valueDisplay = document.createElement('pre')
	valueDisplay.style.marginTop = '1em'
	wrapper.appendChild(valueDisplay)

	const params = {
		selectedItem: {
			treePathIndices: [],
			treePathValues: [],
			leafValue: undefined,
		},
	}

	const pane = new Pane({
		container,
	})

	// Register plugin
	pane.registerPlugin(TweakpaneTreePlugin)

	// Add tree binding with sample data
	const treeApi = pane.addBinding(params, 'selectedItem', {
		view: 'tree',
		label: 'Selected Item:',
		maxHeight: `min(calc(100vh - 6em), 100em)`, // Limit height to 100em with scrolling
		children: [
			{
				label: 'Colors',
				children: [
					{ label: 'Red', value: '#ff0000' },
					{ label: 'Green', value: '#00ff00' },
					{ label: 'Blue', value: '#0000ff' },
					{ label: 'Yellow', value: '#ffff00' },
					{ label: 'Cyan', value: '#00ffff' },
					{ label: 'Magenta', value: '#ff00ff' },
					{
						label: 'Light Colors',
						children: [
							{ label: 'Light Red', value: '#ffcccc' },
							{ label: 'Light Green', value: '#ccffcc' },
							{ label: 'Light Blue', value: '#ccccff' },
							{ label: 'Light Yellow', value: '#ffffcc' },
							{ label: 'Light Cyan', value: '#ccffff' },
							{ label: 'Light Magenta', value: '#ffccff' },
						],
					},
					{
						label: 'Dark Colors',
						children: [
							{ label: 'Dark Red', value: '#880000' },
							{ label: 'Dark Green', value: '#008800' },
							{ label: 'Dark Blue', value: '#000088' },
						],
					},
				],
			},
			{
				label: 'Sizes',
				children: [
					{ label: 'Extra Small', value: 5 },
					{ label: 'Small', value: 10 },
					{ label: 'Medium', value: 20 },
					{ label: 'Large', value: 30 },
					{ label: 'Extra Large', value: 40 },
					{
						label: 'Custom Sizes',
						children: [
							{ label: 'Tiny', value: 2 },
							{ label: 'Mini', value: 8 },
							{ label: 'Huge', value: 50 },
							{ label: 'Gigantic', value: 100 },
						],
					},
				],
			},
			{
				label: 'Fonts',
				children: [
					{ label: 'Arial', value: 'Arial' },
					{ label: 'Times New Roman', value: 'Times New Roman' },
					{ label: 'Courier New', value: 'Courier New' },
					{ label: 'Georgia', value: 'Georgia' },
					{ label: 'Verdana', value: 'Verdana' },
				],
			},
			{
				label: 'Standalone Option Long Long Long Long Long Looooooooooooooooooooooooooooooooooong label',
				value: 'standalone',
			},
		],
	}).on('change', (ev) => {
		console.log('Tree value changed:', ev.value)
		valueDisplay.textContent = JSON.stringify(ev.value, null, 2)
	})

	// Initialize display
	valueDisplay.textContent = JSON.stringify(params.selectedItem, null, 2)

	return {
		wrapper,
		pane,
		treeApi,
	}

	// window.pane = pane
	// window.treeApi = treeApi
}
