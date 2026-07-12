'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import MenuIcon from '@mui/icons-material/Menu'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import TranslateIcon from '@mui/icons-material/Translate'
import { getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'

interface NavbarProps {
  lang: Locale
  dict: {
    common: {
      Home: string
      Archive: string
      About: string
      RSS: string
      Navigation: string
      OpenMenu: string
      CloseMenu: string
      ChangeLanguage: string
      MoreOptions: string
    }
  }
  RenderThemeChanger: () => React.ReactNode
}

const supportedLocales: Record<Locale, string> = {
	zh: '简体中文',
	en: 'English',
}

export default function Navbar({ lang, dict, RenderThemeChanger }: NavbarProps) {
	const [moreMenuVisible, setMoreMenuVisible] = useState(false)
	const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
	const [translateMenuVisible, setTranslateMenuVisible] = useState(false)
	const translateMenuId = useId()
	const moreMenuId = useId()
	const mobileMenuId = useId()
	const navRef = useRef<HTMLElement>(null)
	const pathname = usePathname()

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

	const localeChoices = (close: () => void) => sortedLocales.map((locale) => {
		const displayName = supportedLocales[locale]
		const className = `block w-full px-4 py-2 text-sm ${
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
		<div className="w-full max-w-4xl">
			<nav ref={navRef} className="relative" aria-label={dict.common.Navigation}>
				<ul className="hidden md:flex items-center justify-center space-x-3 list-none">
					<li>
						<Link
							href={getLocalePath(lang)}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<HomeIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.Home}</span>
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
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.Archive}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/about')}
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<InfoIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.About}</span>
						</Link>
					</li>
					<li>
						<a
							href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
							type="application/atom+xml"
							className="inline-flex items-center px-3 py-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
						>
							<RssFeedIcon aria-hidden className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.RSS}</span>
						</a>
					</li>
					<li className="flex-grow" aria-hidden />
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

				<div
					className="md:hidden"
					onKeyDown={(event) => closeOnEscape(event, () => setMobileMenuVisible(false))}
				>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={() => setMobileMenuVisible((visible) => !visible)}
							className="p-2 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-site-surface-muted transition-colors"
							aria-label={mobileMenuVisible ? dict.common.CloseMenu : dict.common.OpenMenu}
							aria-controls={mobileMenuId}
							aria-expanded={mobileMenuVisible}
						>
							<MenuIcon aria-hidden className="w-6 h-6" />
						</button>
					</div>

					{mobileMenuVisible && (
						<div
							id={mobileMenuId}
							className="absolute left-0 right-0 bg-site-surface shadow-lg border-b border-site-line"
						>
							<ul className="px-2 py-2 list-none">
								<li>
									<Link
										href={getLocalePath(lang)}
										onClick={() => setMobileMenuVisible(false)}
										className="flex items-center px-4 py-2.5 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-site-surface-muted rounded-lg transition-colors"
									>
										<HomeIcon aria-hidden className="w-5 h-5" />
										<span className="ml-3 text-sm font-medium">{dict.common.Home}</span>
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/archive')}
										onClick={() => setMobileMenuVisible(false)}
										className="flex items-center px-4 py-2.5 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-site-surface-muted rounded-lg transition-colors"
									>
										<svg aria-hidden xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24">
											<path fill="currentColor" d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z" />
										</svg>
										<span className="ml-3 text-sm font-medium">{dict.common.Archive}</span>
									</Link>
								</li>
								<li>
									<Link
										href={getLocalePath(lang, '/about')}
										onClick={() => setMobileMenuVisible(false)}
										className="flex items-center px-4 py-2.5 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-site-surface-muted rounded-lg transition-colors"
									>
										<InfoIcon aria-hidden className="w-5 h-5" />
										<span className="ml-3 text-sm font-medium">{dict.common.About}</span>
									</Link>
								</li>
								<li>
									<a
										href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
										type="application/atom+xml"
										onClick={() => setMobileMenuVisible(false)}
										className="flex items-center px-4 py-2.5 text-site-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-site-surface-muted rounded-lg transition-colors"
									>
										<RssFeedIcon aria-hidden className="w-5 h-5" />
										<span className="ml-3 text-sm font-medium">{dict.common.RSS}</span>
									</a>
								</li>
							</ul>

							<ul
								className="mx-2 border-t border-site-line pt-2 list-none"
								aria-label={dict.common.ChangeLanguage}
							>
								{localeChoices(() => setMobileMenuVisible(false))}
							</ul>

							<div className="mx-2 border-t border-site-line mt-2 py-2 px-4">
								{RenderThemeChanger()}
							</div>
						</div>
					)}
				</div>
			</nav>
		</div>
	)
}
