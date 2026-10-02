'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type {
	ComponentProps,
	Dispatch,
	FocusEvent,
	KeyboardEvent,
	PointerEvent as ReactPointerEvent,
	RefObject,
	SetStateAction,
} from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
	ArchiveIcon,
	CloseIcon,
	HomeIcon,
	InfoIcon,
	MenuIcon,
	MoreHorizIcon,
	RssFeedIcon,
	SearchIcon,
	TranslateIcon,
} from '@/components/Icons'
import { getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
// Type-only: erased at build time, so it does not pull the dialog into this bundle.
import type SearchDialogComponent from '@/components/Search'

// A tab that outlived a redeploy (its hashed chunks are gone) or lost its
// connection must not take the page down with it: search just closes again.
function SearchUnavailable({ onOpenChange }: ComponentProps<typeof SearchDialogComponent>) {
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

interface NavbarProps {
  lang: Locale
  siteTitle: string
  dict: { common: CommonDictionary }
  RenderThemeChanger: () => React.ReactNode
}

const supportedLocales: Record<Locale, string> = {
	zh: '简体中文',
	en: 'English',
}

// Short forms for the mobile bar, where there is no room for the full name.
const localeShortLabels: Record<Locale, string> = {
	zh: '中',
	en: 'EN',
}

const searchEnabled = process.env.NEXT_PUBLIC_SHOW_SEARCH === 'true'

/** Apple devices take the search shortcut on Cmd, everything else on Ctrl. */
const isApplePlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

// The hint never changes for a given device, so there is nothing to subscribe
// to; the snapshot is a plain string and compares stably between renders.
const subscribeToNothing = () => () => {}
const getShortcutHint = () => (isApplePlatform() ? '⌘K' : 'Ctrl K')

export default function Navbar({
	lang,
	dict,
	siteTitle,
	RenderThemeChanger,
}: NavbarProps) {
	const [moreMenuVisible, setMoreMenuVisible] = useState(false)
	const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
	const [translateMenuVisible, setTranslateMenuVisible] = useState(false)
	const [searchOpen, setSearchOpen] = useState(false)
	// Set once and never cleared: the dialog then stays mounted (closed until
	// opened), so opening is immediate and a reopened search keeps its query.
	const [searchLoaded, setSearchLoaded] = useState(false)
	const translateMenuId = useId()
	const moreMenuId = useId()
	const mobileMenuId = useId()
	const navRef = useRef<HTMLElement>(null)
	const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
	const translateOpenedByHover = useRef(false)
	const moreOpenedByHover = useRef(false)
	const pathname = usePathname()

	const mountSearch = () => setSearchLoaded(true)
	const openSearch = () => {
		setSearchLoaded(true)
		setSearchOpen(true)
	}

	// Cmd+K on Apple devices and Ctrl+K elsewhere: only the modifier the hint
	// advertises, since on macOS Ctrl+K in a text field is the native "delete
	// to end of line". Bound here, not in the dialog, which is not loaded yet.
	useEffect(() => {
		// Do not swallow the browser's own Cmd+K when there is no dialog to open.
		if (!searchEnabled) return

		const apple = isApplePlatform()

		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			const modifier = apple ? event.metaKey : event.ctrlKey
			if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setSearchLoaded(true)
				setSearchOpen(true)
			}
		}

		window.addEventListener('keydown', onKeyDown)

		// Mount the dialog, closed, once the page is idle. A lazy component
		// suspends on its first render, so mounting it only on the first
		// Cmd/Ctrl+K would lose the keys typed while its chunk loads.
		const mount = () => setSearchLoaded(true)
		const idle = typeof window.requestIdleCallback === 'function'
			? window.requestIdleCallback(mount, { timeout: 2000 })
			: undefined
		const timer = idle === undefined ? window.setTimeout(mount, 1000) : undefined

		return () => {
			window.removeEventListener('keydown', onKeyDown)
			if (idle !== undefined) window.cancelIdleCallback(idle)
			if (timer !== undefined) window.clearTimeout(timer)
		}
	}, [])

	// The modifier key depends on the platform, which the server cannot know.
	// The server snapshot is null and the badge appears after hydration, so the
	// two renders agree instead of mismatching.
	const shortcutHint = useSyncExternalStore(subscribeToNothing, getShortcutHint, () => null)

	useEffect(() => {
		if (!moreMenuVisible && !mobileMenuVisible && !translateMenuVisible) {
			return
		}

		const closeOutside = (event: PointerEvent) => {
			if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
				setMoreMenuVisible(false)
				setMobileMenuVisible(false)
				setTranslateMenuVisible(false)
			}
		}

		document.addEventListener('pointerdown', closeOutside)
		return () => document.removeEventListener('pointerdown', closeOutside)
	}, [mobileMenuVisible, moreMenuVisible, translateMenuVisible])

	const segments = pathname.split('/')
	const pathWithoutLocale = (
		segments[1] === 'en' || segments[1] === 'zh'
			? '/' + segments.slice(2).join('/')
			: pathname
	) || '/'
	const sortedLocales: Locale[] = [
		lang,
		...Object.keys(supportedLocales).filter((locale) => locale !== lang) as Locale[],
	]
	// With exactly two locales, the mobile bar can switch straight to the other
	// one instead of opening a menu to choose.
	const otherLocale = sortedLocales[1]
	// Home is current only on the first page; on /page/N the pagination marks
	// the current page instead.
	const ariaCurrent = (path: string) => (path === pathWithoutLocale ? 'page' : undefined)

	// Hover opens a menu for a mouse only: a touch tap fires the same enter
	// events just before its click, which would toggle the menu shut again.
	// The click that follows a hover keeps open the menu the hover opened.
	const hoverMenu = (
		event: ReactPointerEvent<HTMLElement>,
		openedByHover: RefObject<boolean>,
		setVisible: Dispatch<SetStateAction<boolean>>,
		visible: boolean
	) => {
		if (event.pointerType !== 'mouse') return
		openedByHover.current = visible
		setVisible(visible)
	}

	const toggleMenu = (
		openedByHover: RefObject<boolean>,
		setVisible: Dispatch<SetStateAction<boolean>>
	) => {
		if (openedByHover.current) {
			openedByHover.current = false
			setVisible(true)
			return
		}
		setVisible((visible) => !visible)
	}

	const closeWhenFocusLeaves = (
		event: FocusEvent<HTMLElement>,
		close: () => void
	) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			close()
		}
	}

	const closeOnEscape = (
		event: KeyboardEvent<HTMLElement>,
		close: () => void
	) => {
		if (event.key === 'Escape') {
			event.preventDefault()
			close()
			event.currentTarget.querySelector<HTMLButtonElement>('button[aria-controls]')?.focus()
		}
	}

	const closeMobileOnEscape = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key !== 'Escape' || !mobileMenuVisible) return

		event.preventDefault()
		setMobileMenuVisible(false)
		window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus())
	}

	const localeChoices = (close: () => void) => sortedLocales.map((locale) => {
		const displayName = supportedLocales[locale]
		const className = `block w-full rounded-lg px-4 py-2 text-sm ${
			lang !== locale
				? 'text-site-muted hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400'
				: 'text-blue-600 dark:text-blue-400 font-medium'
		}`

		return (
			<li key={locale}>
				{locale !== lang ? (
					<Link
						href={getLocalePath(locale, pathWithoutLocale)}
						className={className}
						hrefLang={locale}
						lang={locale}
						onClick={close}
					>
						{displayName}
					</Link>
				) : (
					<span className={className} aria-current="true" lang={locale}>
						{displayName}
					</span>
				)}
			</li>
		)
	})

	return (
		<div className="mx-auto w-full max-w-4xl">
			<nav ref={navRef} className="relative" aria-label={dict.common.Navigation}>
				<ul className="hidden h-14 items-center space-x-1 list-none md:flex">
					<li className="mr-3 min-w-0 shrink">
						<Link
							href={getLocalePath(lang)}
							className="block max-w-44 truncate text-xl font-semibold tracking-wide text-site-heading transition-colors hover:text-blue-600 dark:hover:text-blue-400"
						>
							{siteTitle}
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang)}
							aria-current={ariaCurrent('/')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
						>
							<HomeIcon />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.Home}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/archive')}
							aria-current={ariaCurrent('/archive')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
						>
							<ArchiveIcon />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.Archive}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/about')}
							aria-current={ariaCurrent('/about')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
						>
							<InfoIcon />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.About}</span>
						</Link>
					</li>
					<li>
						<a
							href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
							type="application/atom+xml"
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<RssFeedIcon />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.RSS}</span>
						</a>
					</li>
					<li className="flex-grow" aria-hidden />
					{searchEnabled && (
						<li className="mr-1">
							{/* A boxed field rather than a nav link, sitting with the other
							    controls on the right: it opens a search input, so it reads
							    as one. */}
							<button
								type="button"
								onClick={openSearch}
								onPointerEnter={mountSearch}
								onFocus={mountSearch}
								className="inline-flex w-40 items-center gap-2 rounded-lg border border-site-line bg-site-surface py-1.5 pl-3 pr-2 text-site-muted transition-colors hover:border-blue-500/60 hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 lg:w-56 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400"
							>
								<SearchIcon />
								<span className="text-base whitespace-nowrap">{dict.common.Search}</span>
								{/* Rendered only after mount: the modifier depends on the
								    platform, which the server cannot know. */}
								{shortcutHint && (
									<kbd className="ml-auto rounded border border-site-line px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-site-muted">
										{shortcutHint}
									</kbd>
								)}
							</button>
						</li>
					)}
					<li
						className="hidden xl:block relative"
						onPointerEnter={(event) => hoverMenu(event, translateOpenedByHover, setTranslateMenuVisible, true)}
						onPointerLeave={(event) => hoverMenu(event, translateOpenedByHover, setTranslateMenuVisible, false)}
						onBlur={(event) => closeWhenFocusLeaves(event, () => setTranslateMenuVisible(false))}
						onKeyDown={(event) => closeOnEscape(event, () => setTranslateMenuVisible(false))}
					>
						<button
							type="button"
							className="flex items-center gap-1 p-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
							aria-label={dict.common.ChangeLanguage}
							aria-controls={translateMenuId}
							aria-expanded={translateMenuVisible}
							onClick={() => toggleMenu(translateOpenedByHover, setTranslateMenuVisible)}
						>
							<TranslateIcon />
							<svg aria-hidden className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{translateMenuVisible && (
							<div className="absolute right-0 pt-2 w-40 z-50">
								<ul
									id={translateMenuId}
									className="py-2 list-none bg-site-surface rounded-lg shadow-lg ring-1 ring-site-line"
									aria-label={dict.common.ChangeLanguage}
								>
									{localeChoices(() => setTranslateMenuVisible(false))}
								</ul>
							</div>
						)}
					</li>
					<li className="hidden xl:block">{RenderThemeChanger()}</li>
					<li
						className="hidden md:block xl:hidden relative"
						onPointerEnter={(event) => hoverMenu(event, moreOpenedByHover, setMoreMenuVisible, true)}
						onPointerLeave={(event) => hoverMenu(event, moreOpenedByHover, setMoreMenuVisible, false)}
						onBlur={(event) => closeWhenFocusLeaves(event, () => setMoreMenuVisible(false))}
						onKeyDown={(event) => closeOnEscape(event, () => setMoreMenuVisible(false))}
					>
						<button
							type="button"
							className="p-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
							aria-label={dict.common.MoreOptions}
							aria-controls={moreMenuId}
							aria-expanded={moreMenuVisible}
							onClick={() => toggleMenu(moreOpenedByHover, setMoreMenuVisible)}
						>
							<MoreHorizIcon className="inline-block" />
						</button>
						{moreMenuVisible && (
							<div
								id={moreMenuId}
								className="absolute right-0 pt-2 w-40 z-50"
							>
								<div className="py-2 bg-site-surface rounded-lg shadow-lg ring-1 ring-site-line">
									<ul className="list-none" aria-label={dict.common.ChangeLanguage}>
										{localeChoices(() => setMoreMenuVisible(false))}
									</ul>
									<div className="border-t border-site-line mt-2 pt-2 px-4">
										{RenderThemeChanger()}
									</div>
								</div>
							</div>
						)}
					</li>
				</ul>

				<div className="md:hidden" onKeyDown={closeMobileOnEscape}>
					<div className="flex min-h-14 items-center justify-between">
						<Link
							href={getLocalePath(lang)}
							onClick={() => setMobileMenuVisible(false)}
							className="min-w-0 flex-1 truncate text-xl font-medium tracking-wide text-site-heading transition-colors hover:text-blue-600 dark:hover:text-blue-400"
						>
							{siteTitle}
						</Link>
						{/* Search, language and theme sit in the bar itself rather than
						    behind the menu: they are switches, not destinations, and
						    burying them costs two taps each. */}
						<div className="flex shrink-0 items-center">
							{searchEnabled && (
								<button
									type="button"
									onClick={openSearch}
									onPointerEnter={mountSearch}
									onFocus={mountSearch}
									aria-label={dict.common.Search}
									className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400"
								>
									<SearchIcon size={24} />
								</button>
							)}
							<Link
								href={getLocalePath(otherLocale, pathWithoutLocale)}
								hrefLang={otherLocale}
								onClick={() => setMobileMenuVisible(false)}
								title={dict.common.ChangeLanguage}
								className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400"
							>
								{/* The name keeps the visible label, for voice control, and
								    spells out the language it switches to. */}
								<span lang={otherLocale}>
									{localeShortLabels[otherLocale]}
									<span className="sr-only"> {supportedLocales[otherLocale]}</span>
								</span>
							</Link>
							{RenderThemeChanger()}
							<button
								ref={mobileMenuButtonRef}
								type="button"
								onClick={() => setMobileMenuVisible((visible) => !visible)}
								className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400"
								aria-label={mobileMenuVisible ? dict.common.CloseMenu : dict.common.OpenMenu}
								aria-controls={mobileMenuId}
								aria-expanded={mobileMenuVisible}
							>
								{mobileMenuVisible ? (
									<CloseIcon size={24} />
								) : (
									<MenuIcon size={24} />
								)}
							</button>
						</div>
					</div>

					{mobileMenuVisible && (
						<div
							id={mobileMenuId}
							className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-t border-site-line bg-site-header pb-3 pt-3"
						>
							{/* Destinations only — search, language and theme live in the
							    bar above. */}
							<ul className="grid grid-cols-2 gap-2 list-none">
								<li>
									<Link
										href={getLocalePath(lang)}
										onClick={() => setMobileMenuVisible(false)}
										aria-current={ariaCurrent('/')}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400 aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
									>
										<HomeIcon />
										{dict.common.Home}
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/archive')}
										onClick={() => setMobileMenuVisible(false)}
										aria-current={ariaCurrent('/archive')}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400 aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
									>
										<ArchiveIcon />
										{dict.common.Archive}
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/about')}
										onClick={() => setMobileMenuVisible(false)}
										aria-current={ariaCurrent('/about')}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400 aria-[current=page]:bg-site-surface-muted aria-[current=page]:text-site-heading"
									>
										<InfoIcon />
										{dict.common.About}
									</Link>
								</li>
								<li>
									<a
										href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
										type="application/atom+xml"
										onClick={() => setMobileMenuVisible(false)}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400"
									>
										<RssFeedIcon />
										{dict.common.RSS}
									</a>
								</li>
							</ul>
						</div>
					)}
				</div>
			</nav>

			{searchEnabled && searchLoaded && (
				<SearchDialog
					lang={lang}
					dict={dict}
					open={searchOpen}
					onOpenChange={setSearchOpen}
				/>
			)}
		</div>
	)
}
