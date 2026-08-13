import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: {
		// Mirrors tsconfig's `@/*` → `./*`. Vitest resolves imports through
		// Vite, which does not read tsconfig paths, so the alias is restated
		// here and the suites can import the way the application code does.
		alias: { '@': import.meta.dirname },
	},
	test: {
		include: ['**/*.test.{ts,tsx,mjs}'],
		environment: 'node',
	},
})
