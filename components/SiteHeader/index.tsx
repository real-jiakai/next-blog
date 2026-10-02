'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ComponentProps } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { MoonIcon, SearchIcon, SunIcon } from '@/components/Icons'
import { bindSearchShortcut, toggledTheme, whenIdle } from '@/components/SiteHeader/interaction'
import { getLocalePath, i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { isApplePlatform } from '@/lib/search'
// Type-only: erased at build time, so it does not pull the dialog into this bundle.
import type SearchDialogComponent from '@/components/Search'

// A tab that outlived a redeploy (its hashed chunks are gone) or lost its
// connection must not take the page down with it: search just closes again.
export function SearchUnavailable({ onOpenChange }: ComponentProps<typeof SearchDialogComponent>) {
	useEffect(() => onOpenChange(false), [onOpenChange])
	return null
}

// Fetched once the page is idle (or when search is first reached), so the
// dialog and the date formatting it brings stay out of the bundle every page
// loads. Nothing may import '@/components/Search' statically, or it lands back
// in that bundle.
const SearchDialog = dynamic(
	() => import('@/components/Search').catch(() => ({ default: SearchUnavailable })),
	{ ssr: false }
)

interface SiteHeaderProps {
	lang: Locale
	dict: { common: CommonDictionary }
}

// The switch shows the short form; the full name completes its accessible
// name, so a screen reader announces the language and voice control can
// still say the visible label.
const localeLabels: Record<Locale, { short: string, name: string }> = {
	zh: { short: '中', name: '简体中文' },
	en: { short: 'EN', name: 'English' },
}

const searchEnabled = process.env.NEXT_PUBLIC_SHOW_SEARCH === 'true'

// Nothing to subscribe to: the snapshot only tells the server render (false)
// apart from the hydrated client (true).
const subscribeToNothing = () => () => {}

// The current page is marked by a 2px accent underline that sits just above
// the bar's hairline, not by a filled pill.
const navLinkClass =
	'min-h-11 items-center px-2 text-[0.9375rem] text-site-muted transition-colors hover:text-site-heading aria-[current=page]:text-site-heading aria-[current=page]:underline aria-[current=page]:decoration-site-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[0.55rem]'

// 44px squares on phones, where the controls are icons; 36px rows beside text
// from md up.
const controlClass =
	'inline-flex min-h-11 min-w-11 items-center justify-center text-site-muted transition-colors hover:text-site-heading md:min-h-9'

/**
 * The bar on every page: About and the feed on the left, the site name in the
 * centre, search, language and theme on the right. Three equal-sided grid
 * columns keep the name centred whatever the two sides hold.
 */
export default function SiteHeader({ lang, dict }: SiteHeaderProps) {
	const { setTheme, resolvedTheme, systemTheme } = useTheme()
	const [searchOpen, setSearchOpen] = useState(false)
	// Set once and never cleared: the dialog then stays mounted (closed until
	// opened), so opening is immediate and a reopened search keeps its query.
	const [searchLoaded, setSearchLoaded] = useState(false)
	const pathname = usePathname()
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'

	// The theme is only known in the browser, so the toggle reports no pressed
	// state until hydration has finished and the two renders agree.
	const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
	const isDark = hydrated ? resolvedTheme === 'dark' : undefined

	const mountSearch = () => setSearchLoaded(true)
	const openSearch = () => {
		setSearchLoaded(true)
		setSearchOpen(true)
	}

	useEffect(() => {
		// Do not swallow the browser's own Cmd/Ctrl+K when there is no dialog
		// to open.
		if (!searchEnabled) return

		// Bound here, not in the dialog, which is not loaded yet.
		const unbind = bindSearchShortcut(window, isApplePlatform(navigator.userAgent), () => {
			setSearchLoaded(true)
			setSearchOpen(true)
		})
		// Mount the dialog, closed, once the page is idle. A lazy component
		// suspends on its first render, so mounting it only on the first
		// Cmd/Ctrl+K would lose the keys typed while its chunk loads.
		const cancelMount = whenIdle(window, () => setSearchLoaded(true))

		return () => {
			unbind()
			cancelMount()
		}
	}, [])

	const segments = pathname.split('/')
	const pathWithoutLocale = (
		segments[1] === 'en' || segments[1] === 'zh'
			? '/' + segments.slice(2).join('/')
			: pathname
	) || '/'
	// Only the contents page and About are ever current; a post is neither.
	const ariaCurrent = (path: string) => (path === pathWithoutLocale ? 'page' : undefined)

	return (
		<header className="sticky top-0 z-40 border-b border-site-line bg-site-header backdrop-blur-sm">
			<div className="mx-auto grid h-14 w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6">
				{/* The negative margins line the first and last glyphs up with the
				    page's text edge; the padding around them is only hit area. */}
				<nav
					aria-label={dict.common.Navigation}
					className="-ml-2 flex items-center justify-start gap-1 md:gap-3"
				>
					<Link
						href={getLocalePath(lang, '/about')}
						aria-current={ariaCurrent('/about')}
						className={`inline-flex ${navLinkClass}`}
					>
						{dict.common.About}
					</Link>
					<a
						href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
						type="application/atom+xml"
						className={`hidden md:inline-flex ${navLinkClass}`}
					>
						{dict.common.RSS}
					</a>
				</nav>

				<Link
					id="site-brand"
					href={getLocalePath(lang)}
					aria-current={ariaCurrent('/')}
					className="inline-flex items-center gap-2 whitespace-nowrap text-xl font-bold tracking-[0.06em] text-site-heading"
				>
					<span aria-hidden className="size-2 bg-site-accent" />
					{siteTitle}
				</Link>

				<div className="-mr-3 flex items-center justify-end gap-1 md:-mr-2 md:gap-2">
					{searchEnabled && (
						// No shortcut badge here: the dialog's legend teaches it.
						// The label is the visible word, which phones do not show.
						<button
							type="button"
							onClick={openSearch}
							onPointerEnter={mountSearch}
							onFocus={mountSearch}
							aria-label={dict.common.Search}
							// Only the platform's own chord is bound, so only it is
							// announced; the server cannot tell which that is.
							aria-keyshortcuts={hydrated ? (isApplePlatform(navigator.userAgent) ? 'Meta+K' : 'Control+K') : undefined}
							className={`${controlClass} gap-2 px-2 text-[0.9375rem] md:min-w-0`}
						>
							<SearchIcon />
							<span className="hidden md:inline">{dict.common.Search}</span>
						</button>
					)}

					{/* Both languages from md up, the current one marked; phones
					    show only the way to the other. */}
					<div className="flex items-center text-[0.9375rem]">
						{i18n.locales.map((locale, index) => {
							const { short, name } = localeLabels[locale]
							return [
								index > 0 && (
									<span
										key={`${locale}-separator`}
										aria-hidden
										className="hidden text-site-muted/50 md:inline"
									>
										/
									</span>
								),
								locale === lang ? (
									<span
										key={locale}
										aria-current="true"
										lang={locale}
										className="hidden px-1.5 font-semibold text-site-heading md:inline"
									>
										{short}
									</span>
								) : (
									<Link
										key={locale}
										href={getLocalePath(locale, pathWithoutLocale)}
										hrefLang={locale}
										lang={locale}
										className={`${controlClass} px-1.5 md:min-w-0`}
									>
										{short}<span className="sr-only"> {name}</span>
									</Link>
								),
							]
						})}
					</div>

					{/* The icon follows the theme through CSS alone, so the server
					    and the first client render agree. */}
					<button
						type="button"
						aria-label={dict.common.DarkMode}
						aria-pressed={isDark}
						title={dict.common.ToggleTheme}
						onClick={() => setTheme(toggledTheme(resolvedTheme, systemTheme))}
						className={`${controlClass} md:min-w-9`}
					>
						<SunIcon className="dark:hidden" />
						<MoonIcon className="hidden dark:block" />
					</button>
				</div>
			</div>

			{searchEnabled && searchLoaded && (
				<SearchDialog
					lang={lang}
					dict={dict}
					open={searchOpen}
					onOpenChange={setSearchOpen}
				/>
			)}
		</header>
	)
}
