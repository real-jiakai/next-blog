'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import TranslateIcon from '@mui/icons-material/Translate'
import SearchIcon from '@mui/icons-material/Search'
import { getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import SearchDialog, { useSearchHotkey } from '@/components/Search'

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

// The hint never changes for a given device, so there is nothing to subscribe
// to; the snapshot is a plain string and compares stably between renders.
const subscribeToNothing = () => () => {}
const getShortcutHint = () =>
	/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

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
	const translateMenuId = useId()
	const moreMenuId = useId()
	const mobileMenuId = useId()
	const navRef = useRef<HTMLElement>(null)
	const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
	const pathname = usePathname()

	useSearchHotkey(setSearchOpen, searchEnabled)

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
						hrefLang={locale === 'zh' ? 'zh-CN' : 'en-US'}
						onClick={close}
					>
						{displayName}
					</Link>
				) : (
					<span className={className} aria-current="true">
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
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<HomeIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.Home}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/archive')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<svg
								aria-hidden
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5 flex-shrink-0"
								viewBox="0 0 24 24"
							>
								<path
									fill="currentColor"
									d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z"
								/>
							</svg>
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.Archive}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/about')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<InfoIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-base whitespace-nowrap">{dict.common.About}</span>
						</Link>
					</li>
					<li>
						<a
							href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
							type="application/atom+xml"
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<RssFeedIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
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
								onClick={() => setSearchOpen(true)}
								className="inline-flex w-56 items-center gap-2 rounded-lg border border-site-line bg-site-surface py-1.5 pl-3 pr-2 text-site-muted transition-colors hover:border-blue-500/60 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
							>
								<SearchIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
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
						onMouseEnter={() => setTranslateMenuVisible(true)}
						onMouseLeave={() => setTranslateMenuVisible(false)}
						onBlur={(event) => closeWhenFocusLeaves(event, () => setTranslateMenuVisible(false))}
						onKeyDown={(event) => closeOnEscape(event, () => setTranslateMenuVisible(false))}
					>
						<button
							type="button"
							className="flex items-center gap-1 p-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
							aria-label={dict.common.ChangeLanguage}
							aria-controls={translateMenuId}
							aria-expanded={translateMenuVisible}
							onClick={() => setTranslateMenuVisible((visible) => !visible)}
						>
							<TranslateIcon aria-hidden className="w-5 h-5" />
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
						onMouseEnter={() => setMoreMenuVisible(true)}
						onMouseLeave={() => setMoreMenuVisible(false)}
						onBlur={(event) => closeWhenFocusLeaves(event, () => setMoreMenuVisible(false))}
						onKeyDown={(event) => closeOnEscape(event, () => setMoreMenuVisible(false))}
					>
						<button
							type="button"
							className="p-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
							aria-label={dict.common.MoreOptions}
							aria-controls={moreMenuId}
							aria-expanded={moreMenuVisible}
							onClick={() => setMoreMenuVisible((visible) => !visible)}
						>
							<MoreHorizIcon aria-hidden className="w-5 h-5" />
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
									onClick={() => setSearchOpen(true)}
									aria-label={dict.common.Search}
									className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
								>
									<SearchIcon aria-hidden className="h-6 w-6" />
								</button>
							)}
							<Link
								href={getLocalePath(otherLocale, pathWithoutLocale)}
								hrefLang={otherLocale === 'zh' ? 'zh-CN' : 'en-US'}
								onClick={() => setMobileMenuVisible(false)}
								aria-label={dict.common.ChangeLanguage}
								className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
							>
								{localeShortLabels[otherLocale]}
							</Link>
							{RenderThemeChanger()}
							<button
								ref={mobileMenuButtonRef}
								type="button"
								onClick={() => setMobileMenuVisible((visible) => !visible)}
								className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
								aria-label={mobileMenuVisible ? dict.common.CloseMenu : dict.common.OpenMenu}
								aria-controls={mobileMenuId}
								aria-expanded={mobileMenuVisible}
							>
								{mobileMenuVisible ? (
									<CloseIcon aria-hidden className="h-6 w-6" />
								) : (
									<MenuIcon aria-hidden className="h-6 w-6" />
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
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400"
									>
										<HomeIcon aria-hidden className="h-5 w-5" />
										{dict.common.Home}
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/archive')}
										onClick={() => setMobileMenuVisible(false)}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400"
									>
										<svg aria-hidden xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24">
											<path fill="currentColor" d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z" />
										</svg>
										{dict.common.Archive}
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/about')}
										onClick={() => setMobileMenuVisible(false)}
										className="flex min-h-11 items-center gap-3 rounded-xl border border-site-line bg-site-surface px-3 py-2.5 text-base font-medium text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 dark:hover:text-blue-400"
									>
										<InfoIcon aria-hidden className="h-5 w-5" />
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
										<RssFeedIcon aria-hidden className="h-5 w-5" />
										{dict.common.RSS}
									</a>
								</li>
							</ul>
						</div>
					)}
				</div>
			</nav>

			{searchEnabled && (
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
