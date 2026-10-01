import { describe, expect, it } from 'vitest'
import { getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'

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

describe('getLanguageAlternates', () => {
	it('uses language-only hreflang codes with Chinese as x-default', () => {
		expect(getLanguageAlternates('/archive')).toEqual({
			zh: '/archive',
			en: '/en/archive',
			'x-default': '/archive',
		})
	})

	it('builds absolute URLs from a base without a /zh prefix', () => {
		expect(getLanguageAlternates('', 'https://example.com')).toEqual({
			zh: 'https://example.com/',
			en: 'https://example.com/en',
			'x-default': 'https://example.com/',
		})
	})
})
