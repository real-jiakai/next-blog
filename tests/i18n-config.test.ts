import { describe, expect, it } from 'vitest'
import { getLocalePath } from '@/lib/i18n-config'

describe('getLocalePath', () => {
	it('uses one canonical home URL per locale', () => {
		expect(getLocalePath('zh')).toBe('/')
		expect(getLocalePath('en')).toBe('/en')
	})

	it('normalizes paths with and without a leading slash', () => {
		expect(getLocalePath('zh', 'about')).toBe('/about')
		expect(getLocalePath('en', '/about')).toBe('/en/about')
	})
})
