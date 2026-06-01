import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'

export default defineConfig(
	{
		ignores: ['dist', 'src/app.d.ts', '*.config.{ts,js,cjs,mjs}', 'src/hooks.ts']
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	eslintConfigPrettier,
	{
		files: ['**/*.{ts,tsx,mts,cts}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true
			}
		},
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variable',
					types: ['boolean'],
					format: ['snake_case'],
					prefix: ['is_', 'has_', 'can_', 'should_', 'will_', 'did_'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				},
				{
					selector: 'variable',
					format: ['snake_case', 'UPPER_CASE'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				},
				{
					selector: 'function',
					format: ['snake_case'],
					leadingUnderscore: 'allow',
					trailingUnderscore: 'allow'
				}
			]
		}
	},
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-undef': 'off',
			'no-var': 'error',
			'prefer-const': 'error',
			'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
			'no-debugger': 'error',
			complexity: ['error', 15],
			'max-depth': ['error', 2],
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Literal[value=null]',
					message: 'Use undefined instead of null.'
				}
			]
		}
	}
)
