import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

// Merge recommended rules from the TypeScript plugin when available so the
// flat config behaves similarly to `extends: ['plugin:@typescript-eslint/recommended']`.
const tsRecommendedRules =
	(tsPlugin &&
		tsPlugin.configs &&
		tsPlugin.configs.recommended &&
		tsPlugin.configs.recommended.rules) ||
	{}

// ESM flat-config for ESLint v9+
// Keeps config minimal and local to this project. Adjust rules as needed.
export default [
	// Global ignores applied before other file-specific configs.
	{
		ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'],
	},
	// TypeScript files use the TypeScript parser and project-aware rules
	{
		files: ['**/*.ts'],
		ignores: ['dist/**', 'node_modules/**'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: './src/tsconfig.json',
				tsconfigRootDir: new URL('.', import.meta.url).pathname,
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'simple-import-sort': simpleImportSort,
			prettier: prettierPlugin,
		},
		rules: {
			...tsRecommendedRules,
			'prettier/prettier': 'error',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
			'@typescript-eslint/explicit-module-boundary-types': 'off',
		},
	},
	// JavaScript files: do not use the TS project parserOptions (avoids project-file errors)
	{
		files: ['**/*.js'],
		ignores: ['dist/**', 'node_modules/**'],
		languageOptions: {
			parserOptions: {
				sourceType: 'module',
			},
		},
		plugins: {
			'simple-import-sort': simpleImportSort,
			prettier: prettierPlugin,
		},
		rules: {
			'prettier/prettier': 'error',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
		},
	},
]
