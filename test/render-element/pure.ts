import { utils } from 'vitest/browser'
import type { LocatorSelectors } from '@vitest/browser/context'

const { debug, getElementLocatorSelectors } = utils

type PrettyDOMOptions = Parameters<typeof debug>[2]

const mountedContainers = new Set<Element>()

export interface RenderResult extends LocatorSelectors {
	container: Element
	debug(maxLength?: number, options?: PrettyDOMOptions): void
}

export function render(container: HTMLElement): RenderResult {
	document.body.appendChild(container)
	mountedContainers.add(container)

	return {
		container,
		debug: (maxLength, options) => debug(container, maxLength, options),
		...getElementLocatorSelectors(container),
	}
}

export function cleanup() {
	for (const mountedContainer of mountedContainers) {
		if (mountedContainer.parentNode === document.body) {
			document.body.removeChild(mountedContainer)
		}
	}
	mountedContainers.clear()
}
