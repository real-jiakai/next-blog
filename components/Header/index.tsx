'use client'

import { useTheme } from 'next-themes'
import Brightness5Icon from '@mui/icons-material/Brightness5'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'

interface HeaderProps {
  lang: Locale
  dict: {
    common: {
      Home: string
      Archive: string
      About: string
      RSS: string
    }
  }
}

export default function Header({ lang, dict }: HeaderProps) {
	const { setTheme, resolvedTheme } = useTheme()

	// CSS-based icon switching - no hydration mismatch since visibility is controlled by CSS
	const RenderThemeChanger = () => {
		return (
			<button
				aria-label="Toggle theme"
				onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
				className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			>
				{/* Sun icon - visible in light mode, hidden in dark mode */}
				<Brightness5Icon className="w-5 h-5 text-gray-600 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 dark:absolute" />
				{/* Moon icon - hidden in light mode, visible in dark mode */}
				<Brightness4Icon className="absolute top-2 left-2 w-5 h-5 text-gray-300 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 dark:relative dark:top-0 dark:left-0" />
			</button>
		)
	}

	return (
		<header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-14">
					{/* Mobile title */}
					<div className="md:hidden text-xl font-medium tracking-wide text-gray-900 dark:text-gray-100">
						<Link
							href={getLocalePath(lang)}
							className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
						>
							{process.env.NEXT_PUBLIC_SITE_TITLE}
						</Link>
					</div>
					<nav className="flex-1 flex justify-center">
						<Navbar lang={lang} dict={dict} RenderThemeChanger={RenderThemeChanger} />
					</nav>
				</div>
			</div>
		</header>
	)
}
