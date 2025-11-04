import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			// at least one instance is required
			instances: [
				{
					browser: 'chromium',
					viewport: {
						width: 834,
						height: 1112,
					},
				},
			],
		},
	}
})
