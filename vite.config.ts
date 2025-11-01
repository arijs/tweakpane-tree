// We'll use a tiny custom plugin below to inject compiled CSS. This avoids bringing
// in @rollup/plugin-replace as a dependency.
import autoprefixer from 'autoprefixer'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import {compileAsync as sassCompileAsync} from 'sass'
import {type ConfigEnv, defineConfig} from 'vite'

function getDistName(packageName: string) {
	return packageName
		.split(/[@/-]/)
		.filter((c) => c !== '')
		.join('-')
}

async function compileCss() {
	const scssPath = path.resolve('src/sass/plugin.scss')
	const result = await sassCompileAsync(scssPath, {style: 'compressed'})
	const css = result.css.toString()
	const processed = await postcss([autoprefixer]).process(css, {
		from: undefined,
	})
	// Escape single quotes so replacement is safe
	return processed.css.replace(/'/g, "\\'").trim()
}

const pkg = JSON.parse(
	fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)
const distName = getDistName(pkg.name)

export default (defineConfig as any)(async ({mode}: ConfigEnv) => {
	const css = await compileCss()
	const production = mode === 'production'
	const postfix = production ? '.min' : ''

	return {
		build: {
			lib: {
				entry: path.resolve('src/index.ts'),
				formats: ['es'],
				fileName: () => `${distName}${postfix}.js`,
			},
			rollupOptions: {
				external: ['tweakpane'],
				output: {
					globals: {
						tweakpane: 'Tweakpane',
					},
				},
			},
			// Use terser-like minification when production to keep parity with previous builds
			minify: production ? 'esbuild' : false,
		},
		server: {
			open: '/test/browser.html',
		},
		plugins: [
			// Inject compiled CSS by replacing the `__css__` token in source files
			{
				name: 'inject-css',
				transform(code: string, id: string) {
					if (code.includes('__css__')) {
						return {
							code: code.replace(/__css__/g, JSON.stringify(css)),
							map: null,
						}
					}
					return null
				},
			} as any,
		],
	}
})
