import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'

// How 《周见》 is named in each language: the brand stays 周见 after a page's
// own title and as og:site_name, and only an English title that leads with
// the site's name (the default <title>, the contents page, the feed and
// llms.txt) adds the romanisation.
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

	it('titles each contents page with its language\'s name and what the site is', async () => {
		expect((await homeMetadata(params('zh'))).title).toEqual({ absolute: '周见 | 记录网上见闻的个人刊物' })
		expect((await homeMetadata(params('en'))).title).toEqual({
			absolute: '周见 · Zhōu Jiàn | A personal periodical of things seen online',
		})
	})

	it('names the site in Open Graph by its brand in both languages', () => {
		expect(getSiteOpenGraph('zh').siteName).toBe('周见')
		expect(getSiteOpenGraph('en').siteName).toBe('周见')
	})

	it('introduces the periodical in llms.txt', async () => {
		const [heading, , intro, , locales] = (await llms().text()).split('\n')
		expect(heading).toBe('# 周见 · Zhōu Jiàn')
		// The English description already introduces the publication, so the
		// summary is that description alone rather than a second introduction.
		expect(intro).toBe('> English description.')
		expect(locales).toBe('Chinese pages live at the site root; English pages live under /en.')
	})

	// The early issues were translated with a made-up English name for the
	// periodical; the brand is 周见 in English too.
	it('calls the periodical 周见 in every English issue', () => {
		const directory = path.join(process.cwd(), 'posts', 'en')
		const named = fs
			.readdirSync(directory)
			.filter((file) => file.endsWith('.md'))
			.filter((file) => /Weekly Insights/i.test(fs.readFileSync(path.join(directory, file), 'utf8')))

		expect(named).toEqual([])
	})
})
