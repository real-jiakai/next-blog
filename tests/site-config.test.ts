import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSiteDescription, getSiteTitle } from '@/lib/site-config'

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
		const english = getSiteDescription('en')
		expect(english).toMatch(/^周见 \(Zhōu Jiàn\) is /)
		// It names an irregular periodical, not the old weekly newsletter.
		expect(english).not.toMatch(/weekly|newsletter|Insights/i)
		// English copy uses straight quotes by site convention, so it reads
		// the same wherever the description is shown.
		expect(english).not.toMatch(/[\u2018-\u201f]/)
	})
})

describe('getSiteTitle', () => {
	it('gives English its own title and Chinese the brand', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE', '周见')
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE_EN', '周见 · Zhōu Jiàn')

		expect(getSiteTitle('zh')).toBe('周见')
		expect(getSiteTitle('en')).toBe('周见 · Zhōu Jiàn')
	})

	it('falls back to the brand in English', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE', '周见')
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE_EN', '')

		expect(getSiteTitle('en')).toBe('周见')
	})

	it('never lets the English title stand in for the brand', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE', '')
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE_EN', '周见 · Zhōu Jiàn')

		expect(getSiteTitle('zh')).toBe('Blog')
	})

	it('has a generic default when nothing is set', () => {
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE', '')
		vi.stubEnv('NEXT_PUBLIC_SITE_TITLE_EN', '')

		expect(getSiteTitle('zh')).toBe('Blog')
		expect(getSiteTitle('en')).toBe('Blog')
	})
})
