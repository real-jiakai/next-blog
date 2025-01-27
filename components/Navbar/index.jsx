import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useTranslation from 'next-translate/useTranslation'
import HomeIcon from '@mui/icons-material/Home'
import InfoIcon from '@mui/icons-material/Info'
import RssFeedIcon from '@mui/icons-material/RssFeed'
import MenuIcon from '@mui/icons-material/Menu'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import TranslateIcon from '@mui/icons-material/Translate'

export default function Navbar({ RenderThemeChanger }) {
	const [moreMenuVisible, setMoreMenuVisible] = useState(false)
	const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
	const [translateMenuVisible, setTranslateMenuVisible] = useState(false)

	const supportedLocales = {
		zh: '简体中文',
		en: 'English',
	}
	const { t } = useTranslation('common')
	const home = t('Home')
	const archive = t('Archive')
	const about = t('About')
	const rss = t('RSS')

	const router = useRouter()
	const { locale:activeLocale } = router
	const currentUrl = router.asPath

	const sortedLocales = Object.entries(supportedLocales).sort(([localeA], [localeB]) => {
		if (localeA === activeLocale) return -1
		if (localeB === activeLocale) return 1
		return 0
	})

	const handleTranslateMenuClick = () => {
		setTranslateMenuVisible(!translateMenuVisible)
	}
	
	const handleMoreMenuClick = () => {
		setMoreMenuVisible(!moreMenuVisible)
	}
	
	const handleMobileMenuClick = () => {
		setMobileMenuVisible(!mobileMenuVisible)
	}


	return (
		<div className="w-full max-w-4xl">
			<nav className="relative">
				{/* 桌面端导航 */}
				<ul className="hidden md:flex items-center justify-center space-x-3 list-none">
					<li>
						<Link 
							href="/" 
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<HomeIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{home}</span>
						</Link>
					</li>
					<li>
						<Link 
							href="/archive" 
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z" /></svg>
							<span className="ml-2 text-sm whitespace-nowrap">{archive}</span>
						</Link>
					</li>
					<li>
						<Link 
							href="/about" 
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<InfoIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{about}</span>
						</Link>
					</li>
					<li>
						<Link 
							href="/index.xml" 
							className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						>
							<RssFeedIcon className="w-5 h-5 flex-shrink-0" />
							<span className="ml-2 text-sm whitespace-nowrap">{rss}</span>
						</Link>
					</li>
					<div className="flex-grow" />
					<li className="hidden xl:block relative">
						<button
							onClick={handleTranslateMenuClick}
							className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={translateMenuVisible ? 'true' : 'false'}>
							<TranslateIcon className="w-5 h-5" />
						</button>
						{translateMenuVisible && (
							<div
								className="absolute right-0 mt-2 py-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-gray-900/5 text-center"
								onMouseLeave={() => setTranslateMenuVisible(false)}>
								{sortedLocales.map(([locale, displayName]) => (
									<div key={locale} className={`block px-4 py-2 text-sm ${activeLocale !== locale ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'text-blue-600 dark:text-blue-400'}`}>
										{locale !== activeLocale ? <Link href={currentUrl} locale={locale}>{displayName}</Link> : displayName}
									</div>
								))}
							</div>
						)}
					</li>
					<li className="hidden xl:block">{RenderThemeChanger()}</li>

					<li className="hidden md:block xl:hidden relative">
						<button
							onClick={handleMoreMenuClick}
							className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={moreMenuVisible ? 'true' : 'false'}>
							<MoreHorizIcon className="w-5 h-5" />
						</button>
						{moreMenuVisible && (
							<div className="absolute right-0 mt-2 py-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-gray-900/5 text-center"
								onMouseLeave={() => setMoreMenuVisible(false)}>
								<ul className="space-y-2">
									<li className="py-2 bg-white dark:bg-gray-800 rounded-lg">
										{sortedLocales.map(([locale, displayName]) => (
											<div key={locale} className={`block px-4 py-2 text-sm ${activeLocale !== locale ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'text-blue-600 dark:text-blue-400'}`}>
												{locale !== activeLocale ? <Link href={currentUrl} locale={locale}>{displayName}</Link> : displayName}
											</div>
										))}
									</li>
									<li className="py-2 bg-white dark:bg-gray-800 rounded-lg">
										<div className="block px-4 py-2 text-sm">{RenderThemeChanger()}</div>
									</li>
								</ul>
							</div>
						)}
					</li>
				</ul>

				{/* 移动端导航 */}
				<div className="md:hidden">
					{/* 移动端导航按钮 */}
					<div className="flex justify-end">
						<button
							onClick={handleMobileMenuClick}
							className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-expanded={mobileMenuVisible ? 'true' : 'false'}>
							<MenuIcon className="w-6 h-6" />
						</button>
					</div>

					{/* 移动端下拉菜单 */}
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
								href="/"
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<HomeIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{home}</span>
							</Link>
							<Link 
								href="/archive"
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v4H3zm1 5h16v13H4zm5.5 3a.5.5 0 0 0-.5.5V13h6v-1.5a.5.5 0 0 0-.5-.5z" /></svg>
								<span className="ml-3 text-sm font-medium">{archive}</span>
							</Link>
							<Link 
								href="/about"
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<InfoIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{about}</span>
							</Link>
							<Link 
								href="/index.xml"
								onClick={() => setMobileMenuVisible(false)}
								className="flex items-center px-4 py-2.5 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
							>
								<RssFeedIcon className="w-5 h-5" />
								<span className="ml-3 text-sm font-medium">{rss}</span>
							</Link>

							{/* 语言切换 */}
							<div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
								{sortedLocales.map(([locale, displayName]) => (
									<div key={locale} 
										className={`px-4 py-2 text-sm ${
											activeLocale !== locale 
												? 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400' 
												: 'text-blue-600 dark:text-blue-400 font-medium'
										}`}
									>
										{locale !== activeLocale ? (
											<Link 
												href={currentUrl} 
												locale={locale}
												onClick={() => setMobileMenuVisible(false)}
											>
												{displayName}
											</Link>
										) : displayName}
									</div>
								))}
							</div>

							{/* 主题切换 */}
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
