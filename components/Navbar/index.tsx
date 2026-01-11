'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import MenuIcon from '@mui/icons-material/Menu'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import TranslateIcon from '@mui/icons-material/Translate'
import { Locale, i18n, getLocalePath } from '@/lib/i18n-config'

interface NavbarProps {
  lang: Locale
  dict: {
    common: {
      Home: string
      Archive: string
      About: string
      RSS: string
    }
  }
  RenderThemeChanger: () => React.ReactNode
}

export default function Navbar({ lang, dict, RenderThemeChanger }: NavbarProps) {
	const [moreMenuVisible, setMoreMenuVisible] = useState(false)
	const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
	const [translateMenuVisible, setTranslateMenuVisible] = useState(false)

	const supportedLocales: Record<Locale, string> = {
		zh: '简体中文',
		en: 'English',
	}

	const pathname = usePathname()

	// Get path without locale prefix for language switching
	const getPathWithoutLocale = () => {
		const segments = pathname.split('/')
		// Only /en/ has prefix, zh pages have no prefix (but internally routed to /zh/)
		if (segments[1] === 'en' || segments[1] === 'zh') {
			return '/' + segments.slice(2).join('/')
		}
		return pathname
	}

	const pathWithoutLocale = getPathWithoutLocale()

	const sortedLocales = Object.entries(supportedLocales).sort(([localeA]) => {
		return localeA === lang ? -1 : 1
	})

	const handleMobileMenuClick = () => {
		setMobileMenuVisible(!mobileMenuVisible)
	}

	return (
		<div className="w-full max-w-4xl">
			<nav className="relative">
				{/* Desktop navigation */}
				<ul className="hidden md:flex items-center justify-center space-x-3 list-none">
					<li>
						<Link
							href={getLocalePath(lang)}
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<HomeIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.Home}</span>
						</Link>
					</li>
					<li>
						<Link
							href={getLocalePath(lang, '/archive')}
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<svg
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
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<InfoIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.About}</span>
						</Link>
					</li>
					<li>
						<Link
							href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<RssFeedIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{dict.common.RSS}</span>
						</Link>
					</li>
					<div className="flex-grow" />
					<li
						className="hidden xl:block relative"
						onMouseEnter={() => setTranslateMenuVisible(true)}
						onMouseLeave={() => setTranslateMenuVisible(false)}
					>
						<button
							className="flex items-center gap-1 p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={translateMenuVisible ? 'true' : 'false'}
						>
							<TranslateIcon className="w-5 h-5" />
							<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{translateMenuVisible && (
							<div className="absolute right-0 pt-2 w-36 z-50">
								<div className="py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-gray-900/5 dark:ring-gray-700">
									{sortedLocales.map(([locale, displayName]) => (
										<div
											key={locale}
											className={`block px-4 py-2 text-sm ${
												lang !== locale
													? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'
													: 'text-blue-600 dark:text-blue-400 font-medium'
											}`}
										>
											{locale !== lang ? (
												<Link href={getLocalePath(locale as Locale, pathWithoutLocale)}>{displayName}</Link>
											) : (
												displayName
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</li>
					<li className="hidden xl:block">{RenderThemeChanger()}</li>

					<li
						className="hidden md:block xl:hidden relative"
						onMouseEnter={() => setMoreMenuVisible(true)}
						onMouseLeave={() => setMoreMenuVisible(false)}
					>
						<button
							className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={moreMenuVisible ? 'true' : 'false'}
						>
							<MoreHorizIcon className="w-5 h-5" />
						</button>
						{moreMenuVisible && (
							<div className="absolute right-0 pt-2 w-36 z-50">
								<div className="py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-gray-900/5 dark:ring-gray-700">
									{sortedLocales.map(([locale, displayName]) => (
										<div
											key={locale}
											className={`block px-4 py-2 text-sm ${
												lang !== locale
													? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'
													: 'text-blue-600 dark:text-blue-400 font-medium'
											}`}
										>
											{locale !== lang ? (
												<Link href={getLocalePath(locale as Locale, pathWithoutLocale)}>{displayName}</Link>
											) : (
												displayName
											)}
										</div>
									))}
									<div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-4">
										{RenderThemeChanger()}
									</div>
								</div>
							</div>
						)}
					</li>
				</ul>

				{/* Mobile navigation */}
				<div className="md:hidden">
					<div className="flex justify-end">
						<button
							onClick={handleMobileMenuClick}
							className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={mobileMenuVisible ? 'true' : 'false'}
						>
							<MenuIcon className="w-6 h-6" />
						</button>
					</div>

					<div
						className={`
              absolute left-0 right-0
              bg-white dark:bg-gray-900
              shadow-lg
              border-b border-gray-200 dark:border-gray-700
              overflow-hidden
              transition-all duration-300 ease-in-out
              ${mobileMenuVisible ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
            `}
					>
						<nav className="px-2 py-2">
							<Link
								href={getLocalePath(lang)}
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<HomeIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{dict.common.Home}</span>
							</Link>
							<Link
								href={getLocalePath(lang, '/archive')}
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-5 h-5"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z"
									/>
								</svg>
								<span className="ml-3 text-sm font-medium">{dict.common.Archive}</span>
							</Link>
							<Link
								href={getLocalePath(lang, '/about')}
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<InfoIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{dict.common.About}</span>
							</Link>
							<Link
								href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<RssFeedIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{dict.common.RSS}</span>
							</Link>

							{/* Language switcher */}
							<div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
								{sortedLocales.map(([locale, displayName]) => (
									<div
										key={locale}
										className={`px-4 py-2 text-sm ${
											lang !== locale
												? 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
												: 'text-blue-600 dark:text-blue-400 font-medium'
										}`}
									>
										{locale !== lang ? (
											<Link
												href={getLocalePath(locale as Locale, pathWithoutLocale)}
												onClick={() => setMobileMenuVisible(false)}
											>
												{displayName}
											</Link>
										) : (
											displayName
										)}
									</div>
								))}
							</div>

							{/* Theme switcher */}
							<div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-4">
								{RenderThemeChanger()}
							</div>
						</nav>
					</div>
				</div>
			</nav>
		</div>
	)
}
