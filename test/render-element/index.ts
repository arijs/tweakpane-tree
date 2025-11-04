import { beforeEach } from 'vitest'
import { page } from '@vitest/browser/context'
import { cleanup, render } from './pure.js'

export { cleanup, render }

export type { RenderResult } from './pure.js'

page.extend({
	render,
	[Symbol.for('vitest:component-cleanup')]: cleanup,
})

beforeEach(() => {
	cleanup()
})

declare module '@vitest/browser/context' {
	interface BrowserPage {
		render: typeof render
	}
}
