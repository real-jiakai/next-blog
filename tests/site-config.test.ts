import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSiteDescription } from '@/lib/site-config'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('getSiteDescription', () => {
	it('prefers the locale\'s own description', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION', 'Shared')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_ZH', '中文简介')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_EN', 'English description')

		expect(getSiteDescription('zh')).toBe('中文简介')
		expect(getSiteDescription('en')).toBe('English description')
	})

	it('falls back to the shared description, not the other locale\'s', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION', 'Shared')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_ZH', '中文简介')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_EN', '')

		expect(getSiteDescription('en')).toBe('Shared')
	})

	it('has a default in each language when nothing is set', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION', '')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_ZH', '')
		vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_EN', '')

		expect(getSiteDescription('zh')).toBe('专注于分享互联网上有趣的东西。')
		expect(getSiteDescription('en')).toMatch(/^[\x20-\x7e]+$/)
	})
})
