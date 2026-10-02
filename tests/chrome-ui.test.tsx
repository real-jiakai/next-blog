import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GlobalNotFound from '@/app/global-not-found'
import { SearchIcon } from '@/components/Icons'
import NotFound from '@/components/NotFound'
import ScrollToTop from '@/components/ScrollToTop'
import { returnToTop, trackScrolledDown } from '@/components/ScrollToTop/interaction'
import SiteFooter from '@/components/SiteFooter'
import SiteHeader from '@/components/SiteHeader'
import { bindSearchShortcut, toggledTheme, whenIdle } from '@/components/SiteHeader/interaction'
import en from '@/lib/dictionaries/en.json'
import zh from '@/lib/dictionaries/zh.json'
import { i18n } from '@/lib/i18n-config'
import { formatIssueRange } from '@/lib/issues'
import { getAllPostMetadata, getIssueStats } from '@/lib/posts'
import { isApplePlatform, isSearchShortcut } from '@/lib/search'

const pathname = vi.hoisted(() => ({ current: '/' }))
const requestLocale = vi.hoisted(() => ({ current: 'zh' }))

vi.mock('next/navigation', () => ({
	usePathname: () => pathname.current,
	// Lets an eagerly imported SearchDialog render, so a regression fails on
	// the <dialog> assertion rather than on a missing mock export.
	useRouter: () => ({ push() {} }),
}))

// The global 404 reads its locale from the header the proxy sets.
vi.mock('next/headers', () => ({
	headers: async () => new Headers({ 'x-blog-locale': requestLocale.current }),
}))

// next/font only works inside a Next build.
vi.mock('@/lib/fonts', () => ({
	sans: { variable: 'font-sans-variable' },
	display: { variable: 'font-display-variable' },
}))

const dicts = { zh, en } as const

function renderHeader(lang: 'zh' | 'en', path: string, Header = SiteHeader) {
	pathname.current = path
	return renderToStaticMarkup(<Header lang={lang} dict={dicts[lang]} />)
}

function currentHrefs(html: string) {
	return [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)].map(
		([tag]) => tag.match(/href="([^"]*)"/)?.[1]
	)
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, '')

// A stand-in window: Node's EventTarget dispatches like the browser's.
function fakeWindow<T extends object>(fields: T) {
	return Object.assign(new EventTarget(), fields)
}

function press(target: EventTarget, keys: Partial<KeyboardEvent>) {
	const event = Object.assign(new Event('keydown', { cancelable: true }), {
		key: 'k',
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		...keys,
	})
	target.dispatchEvent(event)
	return event
}

type SiteHeaderModule = typeof import('@/components/SiteHeader')
type ModuleFactory = () => Record<string, unknown> | Promise<Record<string, unknown>>

// Re-imports the header with some of its dependencies replaced, then puts the
// real ones back for the tests that follow.
async function importHeaderWith(mocks: Record<string, ModuleFactory>): Promise<SiteHeaderModule> {
	vi.resetModules()
	for (const [name, factory] of Object.entries(mocks)) vi.doMock(name, factory)
	try {
		return await import('@/components/SiteHeader')
	} finally {
		for (const name of Object.keys(mocks)) vi.doUnmock(name)
	}
}

// Hands the component the client's snapshot, as the hydrated header sees it.
async function hydratedReact() {
	const actual = await vi.importActual<typeof import('react')>('react')
	return {
		...actual,
		useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
	}
}

// Runs effects as they are declared, as mounting would.
async function mountingReact() {
	const actual = await vi.importActual<typeof import('react')>('react')
	return { ...actual, useEffect: (effect: () => void) => effect() }
}

// Captures the loaders the header hands next/dynamic instead of loading them.
function capturingDynamic(loaders: (() => Promise<{ default: unknown }>)[]) {
	return () => ({
		default: (loader: () => Promise<{ default: unknown }>, options?: { ssr?: boolean }) => {
			expect(options?.ssr).toBe(false)
			loaders.push(loader)
			return () => null
		},
	})
}

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
	vi.resetModules()
})

describe('SiteFooter', () => {
	it('ends the copyright range at the newest post, not the build date', () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(new Date('2099-06-01T00:00:00Z'))
		const newest = Math.max(
			...i18n.locales.flatMap((locale) => getAllPostMetadata(locale).map((post) => post.year))
		)

		const html = renderToStaticMarkup(<SiteFooter lang="en" dict={en} />)

		// An en dash: the years are a range.
		expect(html).toContain(`© 2022–${newest}`)
		expect(html).not.toContain('2099')
	})

	it.each(['zh', 'en'] as const)('names the periodical and its run of issues in %s', (lang) => {
		const range = formatIssueRange(dicts[lang].common, getIssueStats(lang))
		const html = renderToStaticMarkup(<SiteFooter lang={lang} dict={dicts[lang]} />)

		expect(range).toBeTruthy()
		expect(textOf(html)).toContain(` · ${range}`)
	})

	it('links the feed, the repository and About for the page language', () => {
		const html = renderToStaticMarkup(<SiteFooter lang="en" dict={en} />)

		expect(html).toMatch(/<a href="\/en\/index.xml" type="application\/atom\+xml"[^>]*>RSS<\/a>/)
		expect(html).toMatch(/<a\b[^>]*href="\/en\/about"[^>]*>About<\/a>/)
		expect(renderToStaticMarkup(<SiteFooter lang="zh" dict={zh} />)).toMatch(
			/<a\b[^>]*href="\/about"[^>]*>关于<\/a>/
		)
	})

	it('titles the GitHub link in the page language and keeps its arrow out of the name', () => {
		for (const [lang, title] of [['zh', 'GitHub 仓库'], ['en', 'GitHub repository']] as const) {
			const html = renderToStaticMarkup(<SiteFooter lang={lang} dict={dicts[lang]} />)
			const link = html.match(/<a\b[^>]*target="_blank"[^>]*>.*?<\/a>/)?.[0] ?? ''

			expect(link).toContain(`title="${title}"`)
			expect(link).toContain('rel="noopener noreferrer"')
			expect(link).toMatch(/>GitHub<span aria-hidden="true"> ↗<\/span><\/a>$/)
		}
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

describe('SiteHeader', () => {
	it.each([
		['zh', '/', '/'],
		['zh', '/about', '/about'],
		['en', '/en', '/en'],
		['en', '/en/about', '/en/about'],
	] as const)('marks the current page on %s %s', (lang, path, href) => {
		expect(currentHrefs(renderHeader(lang, path))).toEqual([href])
	})

	it('marks nothing current on a post', () => {
		expect(currentHrefs(renderHeader('zh', '/2024/01/weekly-issue-01'))).toEqual([])
		expect(currentHrefs(renderHeader('en', '/en/2024/01/weekly-issue-01'))).toEqual([])
	})

	it('centres the site name as the home link the back-to-top button focuses', () => {
		const brand = renderHeader('en', '/en/about').match(/<a\b[^>]*id="site-brand"[^>]*>.*?<\/a>/)?.[0] ?? ''

		expect(brand).toContain('href="/en"')
		expect(brand).toContain('<span aria-hidden="true" class="size-2 bg-site-accent"></span>')
	})

	it('puts About and the feed in the navigation and nothing else', () => {
		const nav = renderHeader('en', '/en').match(/<nav\b[^>]*>.*?<\/nav>/)?.[0] ?? ''
		const hrefs = [...nav.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map(([, href]) => href)

		expect(nav).toContain('aria-label="Primary navigation"')
		expect(hrefs).toEqual(['/en/about', '/en/index.xml'])
	})

	it('names the language switch by its visible label and the language it opens', () => {
		const html = renderHeader('zh', '/about')
		const link = html.match(/<a\b[^>]*href="\/en\/about"[^>]*>.*?<\/a>/)?.[0] ?? ''

		expect(link).toContain('hrefLang="en"')
		expect(link).toContain('lang="en"')
		// The accessible name comes from the content and starts with the
		// visible "EN" (WCAG 2.5.3); no aria-label replaces it.
		expect(link).not.toContain('aria-label')
		expect(link).toMatch(/>EN<span class="sr-only"> English<\/span><\/a>$/)
		expect(html).toMatch(/<span aria-current="true" lang="zh" class="[^"]*">中<\/span>/)
	})

	it('switches an English page back to its Chinese address', () => {
		const html = renderHeader('en', '/en/2024/01/weekly-issue-01')
		const link = html.match(/<a\b[^>]*hrefLang="zh"[^>]*>.*?<\/a>/)?.[0] ?? ''

		expect(link).toContain('href="/2024/01/weekly-issue-01"')
		expect(link).toContain('lang="zh"')
		expect(link).toMatch(/>中<span class="sr-only"> 简体中文<\/span><\/a>$/)
		expect(html).toMatch(/<span aria-current="true" lang="en" class="[^"]*">EN<\/span>/)
	})

	it('does not server-render the search dialog', async () => {
		vi.stubEnv('NEXT_PUBLIC_SHOW_SEARCH', 'true')
		// searchEnabled is read once at module load, so re-import with search on.
		vi.resetModules()
		const { default: SearchHeader } = await import('@/components/SiteHeader')
		const html = renderHeader('en', '/en', SearchHeader)
		const button = html.match(/<button\b[^>]*aria-label="Search"[^>]*>.*?<\/button>/)?.[0] ?? ''

		expect(button).toContain('>Search</span>')
		expect(button).toContain('aria-keyshortcuts="Meta+K Control+K"')
		// No shortcut badge in the bar; the dialog's legend teaches it.
		expect(button).not.toContain('<kbd')
		expect(html).not.toContain('<dialog')
	})

	it('renders every icon as a hidden inline SVG', async () => {
		const icons = (html: string) => html.match(/<svg\b[^>]*>/g) ?? []

		// The theme toggle's sun and moon.
		const plain = icons(renderHeader('en', '/en'))
		expect(plain).toHaveLength(2)

		vi.stubEnv('NEXT_PUBLIC_SHOW_SEARCH', 'true')
		vi.resetModules()
		const { default: SearchHeader } = await import('@/components/SiteHeader')
		// …and the search button's magnifier.
		const withSearch = icons(renderHeader('en', '/en', SearchHeader))
		expect(withSearch).toHaveLength(3)

		for (const tag of [...plain, ...withSearch]) expect(tag).toContain('aria-hidden="true"')
	})

	it('names the theme toggle in the page language and leaves its state to the client', () => {
		const toggles = renderHeader('zh', '/').match(/<button\b[^>]*title="切换配色主题"[^>]*>/g) ?? []

		// One bar for every width now, so one toggle.
		expect(toggles).toHaveLength(1)
		expect(toggles[0]).toContain('aria-label="深色模式"')
		// The theme is unknown on the server; a pressed state here would
		// mismatch the client's first render.
		expect(toggles[0]).not.toContain('aria-pressed')
	})

	it.each([
		['dark', 'true'],
		['light', 'false'],
	])('reports the toggle pressed once hydrated in a %s theme', async (resolvedTheme, pressed) => {
		const { default: HydratedHeader } = await importHeaderWith({
			react: hydratedReact,
			'next-themes': () => ({
				useTheme: () => ({ resolvedTheme, systemTheme: 'light', setTheme() {} }),
			}),
		})

		const toggle = renderHeader('en', '/en', HydratedHeader).match(
			/<button\b[^>]*title="Toggle color theme"[^>]*>/
		)?.[0]
		expect(toggle).toContain(`aria-pressed="${pressed}"`)
	})

	it('shows the sun in light mode and the moon in dark mode, through CSS alone', () => {
		const toggle = renderHeader('en', '/en').match(
			/<button\b[^>]*title="Toggle color theme"[^>]*>.*?<\/button>/
		)?.[0] ?? ''
		const icons = toggle.match(/<svg\b[^>]*>/g) ?? []

		expect(icons.map((tag) => tag.match(/class="([^"]*)"/)?.[1])).toEqual([
			'dark:hidden',
			'hidden dark:block',
		])
	})

	it('loads the search dialog lazily and closes search when its chunk is gone', async () => {
		const loaders: (() => Promise<{ default: unknown }>)[] = []
		const header = await importHeaderWith({ 'next/dynamic': capturingDynamic(loaders) })
		expect(loaders).toHaveLength(1)

		// A tab that outlived a redeploy: the hashed chunk no longer exists.
		vi.doMock('@/components/Search', () => {
			throw new Error('ChunkLoadError')
		})
		try {
			await expect(loaders[0]()).resolves.toEqual({ default: header.SearchUnavailable })
		} finally {
			vi.doUnmock('@/components/Search')
		}

		const { SearchUnavailable } = await importHeaderWith({ react: mountingReact })
		const onOpenChange = vi.fn()
		const props = { lang: 'en', dict: en, open: true, onOpenChange } as ComponentProps<typeof SearchUnavailable>
		expect(SearchUnavailable(props)).toBeNull()
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
	})

	it('loads the real dialog when its chunk is there', async () => {
		const loaders: (() => Promise<{ default: unknown }>)[] = []
		await importHeaderWith({ 'next/dynamic': capturingDynamic(loaders) })
		const FakeDialog = () => null
		vi.doMock('@/components/Search', () => ({ default: FakeDialog }))
		try {
			await expect(loaders[0]()).resolves.toMatchObject({ default: FakeDialog })
		} finally {
			vi.doUnmock('@/components/Search')
		}
	})
})

describe('theme toggle', () => {
	it.each([
		// [resolved, system, stored]
		['light', 'light', 'dark'],
		['dark', 'dark', 'light'],
		// Back to what the system shows: follow the system again.
		['light', 'dark', 'system'],
		['dark', 'light', 'system'],
		// Before next-themes knows anything, a press asks for dark.
		[undefined, undefined, 'dark'],
	])('stores %s → %s as %s', (resolvedTheme, systemTheme, stored) => {
		expect(toggledTheme(resolvedTheme, systemTheme)).toBe(stored)
	})
})

describe('search shortcut', () => {
	it.each([
		['Macintosh; Intel Mac OS X 10_15_7', true],
		['iPhone; CPU iPhone OS 17_0 like Mac OS X', true],
		['iPad; CPU OS 17_0 like Mac OS X', true],
		['Windows NT 10.0; Win64; x64', false],
		['Linux; Android 14; Pixel 8', false],
		['X11; Linux x86_64', false],
	])('treats %s as Apple: %s', (platform, apple) => {
		expect(isApplePlatform(`Mozilla/5.0 (${platform}) AppleWebKit/537.36`)).toBe(apple)
	})

	it('takes Cmd+K on Apple devices and Ctrl+K elsewhere, never the other modifier', () => {
		// On macOS Ctrl+K in a text field is "delete to end of line".
		expect(isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }, true)).toBe(true)
		expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, true)).toBe(false)
		expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, false)).toBe(true)
		expect(isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false }, false)).toBe(false)
	})

	it('ignores K with Alt or Shift held, other keys, and a bare K', () => {
		expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: true, altKey: true, shiftKey: false }, false)).toBe(false)
		expect(isSearchShortcut({ key: 'K', metaKey: false, ctrlKey: true, altKey: false, shiftKey: true }, false)).toBe(false)
		expect(isSearchShortcut({ key: 'j', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, false)).toBe(false)
		expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false }, false)).toBe(false)
		// Caps Lock reports an upper-case key without Shift.
		expect(isSearchShortcut({ key: 'K', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false }, false)).toBe(true)
	})

	it('opens search and keeps the key from the browser until unbound', () => {
		const win = fakeWindow({})
		const open = vi.fn()
		const unbind = bindSearchShortcut(win as unknown as Window, true, open)

		expect(press(win, { ctrlKey: true }).defaultPrevented).toBe(false)
		expect(open).not.toHaveBeenCalled()

		expect(press(win, { metaKey: true }).defaultPrevented).toBe(true)
		expect(open).toHaveBeenCalledOnce()

		unbind()
		expect(press(win, { metaKey: true }).defaultPrevented).toBe(false)
		expect(open).toHaveBeenCalledOnce()
	})
})

describe('lazy search mount', () => {
	it('waits for an idle moment, at most two seconds, and can be called off', () => {
		const requestIdleCallback = vi.fn((_callback: () => void, _options?: { timeout: number }) => 7)
		const cancelIdleCallback = vi.fn()
		const setTimeout = vi.fn()
		const mount = vi.fn()
		const cancel = whenIdle(
			{ requestIdleCallback, cancelIdleCallback, setTimeout, clearTimeout: vi.fn() } as unknown as Window,
			mount,
		)

		expect(requestIdleCallback).toHaveBeenCalledWith(mount, { timeout: 2000 })
		expect(setTimeout).not.toHaveBeenCalled()
		expect(mount).not.toHaveBeenCalled()

		requestIdleCallback.mock.calls[0][0]()
		expect(mount).toHaveBeenCalledOnce()

		cancel()
		expect(cancelIdleCallback).toHaveBeenCalledWith(7)
	})

	it('falls back to a one-second timer without requestIdleCallback', () => {
		vi.useFakeTimers()
		// Node has no requestIdleCallback, as Safari has none.
		const host = globalThis as unknown as Window
		const mount = vi.fn()

		whenIdle(host, mount)
		vi.advanceTimersByTime(999)
		expect(mount).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1)
		expect(mount).toHaveBeenCalledOnce()

		const cancelled = vi.fn()
		whenIdle(host, cancelled)()
		vi.advanceTimersByTime(5000)
		expect(cancelled).not.toHaveBeenCalled()
	})
})

describe('ScrollToTop', () => {
	it('renders nothing on the server, before the scroll position is known', () => {
		expect(renderToStaticMarkup(<ScrollToTop label="Back to top" />)).toBe('')
	})

	it('checks the scroll position on load, then follows every scroll', () => {
		// A reload or back navigation restores the position before any scroll
		// event reaches the listener.
		const win = fakeWindow({ scrollY: 1200 })
		const addEventListener = vi.spyOn(win, 'addEventListener')
		const onChange = vi.fn()
		const stop = trackScrolledDown(win as unknown as Window, onChange)

		expect(onChange).toHaveBeenLastCalledWith(true)
		expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })

		win.scrollY = 300
		win.dispatchEvent(new Event('scroll'))
		expect(onChange).toHaveBeenLastCalledWith(false)

		win.scrollY = 301
		win.dispatchEvent(new Event('scroll'))
		expect(onChange).toHaveBeenLastCalledWith(true)

		stop()
		win.scrollY = 0
		win.dispatchEvent(new Event('scroll'))
		expect(onChange).toHaveBeenLastCalledWith(true)
		expect(onChange).toHaveBeenCalledTimes(3)
	})

	it.each([
		[false, 'smooth'],
		[true, 'auto'],
	])('hands focus to the site name, then scrolls up (reduced motion: %s)', (reduced, behavior) => {
		const focus = vi.fn()
		const scrollTo = vi.fn()
		const getElementById = vi.fn((id: string) => (id === 'site-brand' ? { focus } : null))
		const matchMedia = (query: string) => ({
			matches: reduced && query === '(prefers-reduced-motion: reduce)',
		})

		returnToTop({ document: { getElementById }, matchMedia, scrollTo } as unknown as Window)

		expect(getElementById).toHaveBeenCalledWith('site-brand')
		// Without preventScroll the focus would jump the page before the glide.
		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
		// Focus first: the button unmounts at the top and would drop it to <body>.
		expect(focus.mock.invocationCallOrder[0]).toBeLessThan(scrollTo.mock.invocationCallOrder[0])
		expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior })
	})
})

describe('404', () => {
	// next/link writes its attributes in another order than a plain anchor.
	const sortAttributes = (html: string) =>
		html.replace(/<(\w+)((?:\s+[\w-]+="[^"]*")+)>/g, (_tag, name: string, attributes: string) =>
			`<${name} ${attributes.trim().split(/\s+(?=[\w-]+=")/).sort().join(' ')}>`
		)
	const bodyOf = (html: string) => html.match(/<body>(.*)<\/body>/)?.[1]

	it('renders the page language from the URL, left-aligned, with a serif numeral', () => {
		pathname.current = '/en/definitely-missing'
		const html = renderToStaticMarkup(<NotFound />)

		expect(html).toContain('<h1 class="m-0 mt-4')
		expect(textOf(html)).toContain('Page Not Found')
		expect(html).toMatch(/<p aria-hidden="true" class="[^"]*\bfont-display\b[^"]*">404<\/p>/)
		expect(html).toMatch(/<a\b[^>]*href="\/en"[^>]*>Back to Home<span aria-hidden="true"> →<\/span><\/a>/)
		expect(html).not.toContain('text-center')
		expect(html).not.toContain('aria-current')
	})

	it.each(['zh', 'en'] as const)('looks the same from both boundaries in %s', async (lang) => {
		pathname.current = lang === 'en' ? '/en/missing' : '/missing'
		requestLocale.current = lang
		const boundary = renderToStaticMarkup(<NotFound />)
		const global = renderToStaticMarkup(await GlobalNotFound())

		expect(global).toContain(`<html lang="${lang}"`)
		expect(global).toContain('font-display-variable')
		expect(bodyOf(global)).toContain('<main')
		expect(sortAttributes(bodyOf(global) ?? '')).toBe(sortAttributes(boundary))
	})
})
