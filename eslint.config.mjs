import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
	...nextVitals,
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'public/**',
		'next-env.d.ts',
	]),
	{
		rules: {
			'indent': ['error', 'tab'],
			'linebreak-style': ['error', 'unix'],
			'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
			'semi': ['error', 'never'],
			'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
			'no-useless-escape': 'off',
			'react-hooks/set-state-in-effect': 'warn',
		},
	},
])

export default eslintConfig
