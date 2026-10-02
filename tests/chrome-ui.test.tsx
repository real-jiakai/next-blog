import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { SearchIcon } from '@/components/Icons'
import Navbar from '@/components/Navbar'
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

	it('draws the GitHub mark as a hidden inline SVG', () => {
		expect(renderToStaticMarkup(<Footer dict={en} />)).toMatch(
			/<a\b[^>]*aria-label="GitHub repository"[^>]*><svg\b[^>]*aria-hidden="true"/
		)
	})
})

describe('Icons', () => {
	it('render hidden from assistive technology at 20px, in rem so they follow the root font size', () => {
		const html = renderToStaticMarkup(<SearchIcon />)

		expect(html).toMatch(/^<svg\b[^>]*viewBox="0 0 24 24"/)
		expect(html).toContain('fill="currentColor"')
		expect(html).toContain('aria-hidden="true"')
		expect(html).toContain('style="font-size:1.25rem;flex-shrink:0"')
	})

	it('take their size and classes from the call site', () => {
		const html = renderToStaticMarkup(<SearchIcon size={28} className="text-site-muted" />)

		expect(html).toContain('class="text-site-muted"')
		expect(html).toContain('font-size:1.75rem')
	})

	it('leave no icon library or runtime CSS-in-JS in the application source', () => {
		const root = path.resolve(import.meta.dirname, '..')
		const offenders = ['app', 'components', 'lib'].flatMap((directory) =>
			readdirSync(path.join(root, directory), { recursive: true, encoding: 'utf8' })
				.filter((file) => /\.(?:[cm]?[jt]sx?|css)$/.test(file))
				.map((file) => path.join(directory, file))
				.filter((file) => /['"]@(?:mui|emotion)\//.test(readFileSync(path.join(root, file), 'utf8')))
		)

		expect(offenders).toEqual([])
	})
})

describe('Navbar', () => {
	it.each([
		['zh', '/about', '/about'],
		['zh', '/', '/'],
		['en', '/en/about', '/en/about'],
		['en', '/en', '/en'],
	] as const)('marks the current page on %s %s', (lang, path, href) => {
		// The phone menu is not rendered until it is opened.
		expect(currentHrefs(renderNavbar(lang, path))).toEqual([href])
	})

	it('marks nothing current on a post', () => {
		expect(currentHrefs(renderNavbar('zh', '/2024/01/weekly-issue-01'))).toEqual([])
		expect(currentHrefs(renderNavbar('en', '/en/2024/01/weekly-issue-01'))).toEqual([])
	})

	it('names the phone language switch by its visible label and target language', () => {
		const html = renderNavbar('zh', '/about')
		const link = html.match(/<a\b[^>]*href="\/en\/about"[^>]*>.*?<\/a>/)?.[0] ?? ''

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

	it('renders every icon as a hidden inline SVG', () => {
		const html = renderNavbar('en', '/en')
		const icons = html.match(/<svg\b[^>]*>/g) ?? []

		// Home, About, RSS, Translate (with its chevron), More, Menu.
		expect(icons).toHaveLength(7)
		for (const tag of icons) expect(tag).toContain('aria-hidden="true"')
		expect(html).not.toContain('Mui')
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

	it('shows the sun in light mode and the moon in dark mode, through CSS alone', () => {
		pathname.current = '/en'
		const html = renderToStaticMarkup(<Header lang="en" dict={en} />)
		const toggles = html.match(/<button\b[^>]*title="Toggle color theme"[^>]*>.*?<\/button>/g) ?? []

		expect(toggles).toHaveLength(2)
		for (const toggle of toggles) {
			const icons = toggle.match(/<svg\b[^>]*>/g) ?? []
			expect(icons.map((tag) => tag.match(/class="([^"]*)"/)?.[1])).toEqual([
				'dark:hidden',
				'hidden dark:block',
			])
			for (const tag of icons) expect(tag).toContain('aria-hidden="true"')
		}
	})
})
