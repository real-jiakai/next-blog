import { afterAll, describe, expect, it, vi } from 'vitest'

// How 《周见》 is named in each language: the brand stays 周见 everywhere a
// name is shown beside other text, and only a title that stands alone in
// English adds the romanisation.
vi.stubEnv('NEXT_PUBLIC_SITE_TITLE', '周见')
vi.stubEnv('NEXT_PUBLIC_SITE_TITLE_EN', '周见 · Zhōu Jiàn')
vi.stubEnv('NEXT_PUBLIC_SITE_DESCRIPTION_EN', 'English description.')

// next/font only works inside a Next build.
vi.mock('@/lib/fonts', () => ({
	sans: { variable: 'font-sans-variable' },
	display: { variable: 'font-display-variable' },
}))

vi.mock('@/components/Layout', () => ({
	default: () => null,
}))

const { generateMetadata: layoutMetadata } = await import('@/app/[lang]/layout')
const { generateMetadata: homeMetadata } = await import('@/app/[lang]/page')
const { getSiteOpenGraph } = await import('@/lib/metadata')
const { GET: llms } = await import('@/app/llms.txt/route')

const params = (lang: 'zh' | 'en') => ({ params: Promise.resolve({ lang }) })

afterAll(() => {
	vi.unstubAllEnvs()
})

describe('site naming', () => {
	it('defaults the English <title> to the romanised name and keeps the brand in the template', async () => {
		expect((await layoutMetadata(params('zh'))).title).toEqual({
			default: '周见',
			template: '%s | 周见',
		})
		expect((await layoutMetadata(params('en'))).title).toEqual({
			default: '周见 · Zhōu Jiàn',
			template: '%s | 周见',
		})
	})

	it('titles each contents page with its language\'s name and nothing after it', async () => {
		expect((await homeMetadata(params('zh'))).title).toEqual({ absolute: '周见' })
		expect((await homeMetadata(params('en'))).title).toEqual({ absolute: '周见 · Zhōu Jiàn' })
	})

	it('names the site in Open Graph by its brand in both languages', () => {
		expect(getSiteOpenGraph('zh').siteName).toBe('周见')
		expect(getSiteOpenGraph('en').siteName).toBe('周见')
	})

	it('introduces the periodical in llms.txt', async () => {
		const [heading, , intro] = (await llms().text()).split('\n')
		expect(heading).toBe('# 周见 · Zhōu Jiàn')
		expect(intro).toBe(
			'> `周见` (Zhōu Jiàn) is a bilingual (Chinese/English) web periodical by Gu Jiakai. English description.',
		)
	})
})
