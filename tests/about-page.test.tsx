import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import About, { generateMetadata } from '@/app/[lang]/about/page'

vi.mock('@/components/Layout', () => ({
	default: ({ children }: { children: ReactNode }) => children,
}))

const params = (lang: 'zh' | 'en') => ({ params: Promise.resolve({ lang }) })

async function renderText(lang: 'zh' | 'en') {
	const html = renderToStaticMarkup(await About(params(lang)))
	return html.replace(/<[^>]+>/g, '')
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

	it('gives every link a dark-mode colour for each state', async () => {
		const html = renderToStaticMarkup(await About(params('en')))
		const classes = [...html.matchAll(/<a\b[^>]*class="([^"]*)"/g)].map(([, value]) => value)
		expect(classes).toHaveLength(2)
		for (const value of classes) {
			expect(value).toContain('dark:text-blue-400')
			expect(value).toContain('dark:hover:text-blue-300')
			expect(value).toContain('dark:visited:text-purple-400')
		}
	})
})
