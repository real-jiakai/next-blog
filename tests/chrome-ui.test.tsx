import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import Navbar from '@/components/Navbar'
import { listMinHeight } from '@/components/PostCard'
import en from '@/lib/dictionaries/en.json'
import zh from '@/lib/dictionaries/zh.json'
import { i18n } from '@/lib/i18n-config'
import { getAllPostMetadata } from '@/lib/posts'

const pathname = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({
	usePathname: () => pathname.current,
	// Lets an eagerly imported SearchDialog render, so a regression fails on
	// the <dialog> assertion rather than on a missing mock export.
	useRouter: () => ({ push() {} }),
}))

function renderNavbar(lang: 'zh' | 'en', path: string) {
	pathname.current = path
	return renderToStaticMarkup(
		<Navbar
			lang={lang}
			dict={lang === 'zh' ? zh : en}
			siteTitle="Blog"
			RenderThemeChanger={() => null}
		/>
	)
}

function currentHrefs(html: string) {
	return [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)].map(
		([tag]) => tag.match(/href="([^"]*)"/)?.[1]
	)
}

describe('Footer', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('ends the copyright range at the newest post, not the build date', () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(new Date('2099-06-01T00:00:00Z'))
		const newest = Math.max(
			...i18n.locales.flatMap((locale) => getAllPostMetadata(locale).map((post) => post.year))
		)

		const html = renderToStaticMarkup(<Footer dict={en} />)

		expect(html).toContain(`© 2022-${newest}`)
		expect(html).not.toContain('2099')
	})

	it('labels the GitHub link in the page language', () => {
		expect(renderToStaticMarkup(<Footer dict={zh} />)).toContain('aria-label="GitHub 仓库"')
		expect(renderToStaticMarkup(<Footer dict={en} />)).toContain('aria-label="GitHub repository"')
	})
})

describe('Navbar', () => {
	it.each([
		['zh', '/archive', '/archive'],
		['zh', '/about', '/about'],
		['zh', '/', '/'],
		['en', '/en/archive', '/en/archive'],
		['en', '/en', '/en'],
	] as const)('marks the current page on %s %s', (lang, path, href) => {
		// The phone menu is not rendered until it is opened.
		expect(currentHrefs(renderNavbar(lang, path))).toEqual([href])
	})

	it('leaves Home unmarked on later pages, which the pagination marks', () => {
		expect(currentHrefs(renderNavbar('zh', '/page/2'))).toEqual([])
		expect(currentHrefs(renderNavbar('en', '/en/2024/01/weekly-issue-01'))).toEqual([])
	})

	it('names the phone language switch by its visible label and target language', () => {
		const html = renderNavbar('zh', '/archive')
		const link = html.match(/<a\b[^>]*href="\/en\/archive"[^>]*>.*?<\/a>/)?.[0] ?? ''

		expect(link).not.toContain('aria-label')
		expect(link).toContain('<span lang="en">EN<span class="sr-only"> English</span></span>')
	})

	it('does not server-render the search dialog', async () => {
		vi.stubEnv('NEXT_PUBLIC_SHOW_SEARCH', 'true')
		try {
			// searchEnabled is read once at module load, so re-import with search on.
			vi.resetModules()
			const { default: SearchNavbar } = await import('@/components/Navbar')
			pathname.current = '/en'
			const html = renderToStaticMarkup(
				<SearchNavbar lang="en" dict={en} siteTitle="Blog" RenderThemeChanger={() => null} />
			)

			expect(html).toContain('>Search<')
			expect(html).not.toContain('<dialog')
		} finally {
			vi.unstubAllEnvs()
		}
	})
})

describe('Header', () => {
	it('names the theme toggle in the page language and leaves its state to the client', () => {
		pathname.current = '/'
		const html = renderToStaticMarkup(<Header lang="zh" dict={zh} />)
		const toggle = html.match(/<button\b[^>]*title="切换配色主题"[^>]*>/g) ?? []

		// The desktop row and the phone bar each carry one.
		expect(toggle).toHaveLength(2)
		for (const tag of toggle) {
			expect(tag).toContain('aria-label="深色模式"')
			// The theme is unknown on the server; a pressed state here would
			// mismatch the client's first render.
			expect(tag).not.toContain('aria-pressed')
		}
	})
})

describe('listMinHeight', () => {
	it('reserves a full page of cards only where --post-list-floor allows it', () => {
		expect(listMinHeight(10).minHeight).toBe(
			'calc(var(--post-list-floor) * (10 * var(--post-card-height) + 9 * 0.75rem))'
		)
	})
})
