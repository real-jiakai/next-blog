import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import About, { generateMetadata } from '@/app/[lang]/about/page'
import en from '@/lib/dictionaries/en.json'
import zh from '@/lib/dictionaries/zh.json'
import { formatMonthYear } from '@/lib/formatDate'
import { getIssueStats } from '@/lib/posts'

vi.mock('@/components/Layout', () => ({
	default: ({ children }: { children: ReactNode }) => children,
}))

const params = (lang: 'zh' | 'en') => ({ params: Promise.resolve({ lang }) })

async function renderHtml(lang: 'zh' | 'en') {
	return renderToStaticMarkup(await About(params(lang)))
}

async function renderText(lang: 'zh' | 'en') {
	return (await renderHtml(lang)).replace(/<[^>]+>/g, '')
}

describe('About page', () => {
	it.each(['zh', 'en'] as const)('gives the %s Twitter card the same title and description as Open Graph', async (lang) => {
		const metadata = await generateMetadata(params(lang))
		const twitter = metadata.twitter as { title?: unknown, description?: unknown }
		expect(twitter.title).toBe(metadata.openGraph?.title)
		expect(twitter.description).toBe(metadata.openGraph?.description)
	})

	it('spaces Latin link text from the surrounding Chinese on both sides', async () => {
		const text = await renderText('zh')
		expect(text).toContain('欢迎通过 RSS 订阅本站点。')
		expect(text).toContain('欢迎访问我的 GitHub 主页。')
	})

	it('keeps English link text inside the sentence', async () => {
		const text = await renderText('en')
		expect(text).toContain('subscribe via RSS.')
		expect(text).toContain('visit my GitHub profile.')
	})

	it('colours every link with the site tokens, which follow the theme', async () => {
		for (const lang of ['zh', 'en'] as const) {
			const html = await renderHtml(lang)
			const classes = [...html.matchAll(/<a\b[^>]*class="([^"]*)"/g)].map(([, value]) => value)
			expect(classes).toHaveLength(2)
			for (const value of classes) {
				expect(value).toContain('text-site-heading')
				expect(value).toContain('decoration-site-accent')
				expect(value).toContain('hover:text-site-accent')
				expect(value).not.toContain('blue')
				expect(value).not.toContain('purple')
			}
		}
	})

	it.each([['zh', zh], ['en', en]] as const)('lists the five departments in %s under one heading', async (lang, dict) => {
		const html = await renderHtml(lang)
		expect(html.match(/<h1\b/g)).toHaveLength(1)
		const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(([, text]) => text)
		expect(items).toEqual([
			dict.about.SectionCover,
			dict.about.SectionTopic,
			dict.about.SectionInteresting,
			dict.about.SectionLinks,
			dict.about.SectionQuotes,
		].map((value) => value.replaceAll('\'', '&#x27;').replaceAll('"', '&quot;')))
	})

	it.each(['zh', 'en'] as const)('counts the %s issues from the posts', async (lang) => {
		const { count, firstDate } = getIssueStats(lang)
		expect(firstDate).not.toBeNull()
		const text = await renderText(lang)
		const since = formatMonthYear(String(firstDate), lang)
		expect(text).toContain(
			lang === 'zh'
				? `自${since}创刊以来不定期出刊，至今共 ${count} 期。`
				: `${count} issues have appeared since ${since}, on no fixed schedule.`,
		)
	})

	it.each([['zh', zh], ['en', en]] as const)('explains in %s why the first issues lost their images', async (lang, dict) => {
		const html = await renderHtml(lang)
		const stats = html.indexOf(lang === 'zh' ? '创刊以来' : 'issues have appeared')
		const note = html.indexOf(`>${dict.about.LostImages.replace(/'/g, '&#x27;')}</p>`)

		expect(dict.about.LostImages).toContain('竹白')
		expect(dict.about.LostImages).toMatch(/1–8/)
		// After the run of issues it qualifies.
		expect(stats).toBeGreaterThan(-1)
		expect(note).toBeGreaterThan(stats)
	})

	it('names the periodical in English without the old translation', async () => {
		const text = await renderText('en')
		expect(text).toContain('Zhōu Jiàn')
		expect(text).not.toMatch(/Weekly Insights|newsletter/i)
		// Noto Sans SC sets curly quotes full-width, which gaps Latin words.
		expect(text).not.toMatch(/[\u2018-\u201f]/)
	})
})
