'use client'

import { useTheme } from 'next-themes'
import Brightness5Icon from '@mui/icons-material/Brightness5'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Navbar from '@/components/Navbar'
import { Locale } from '@/lib/i18n-config'
import { CommonDictionary } from '@/lib/dictionaries'

interface HeaderProps {
  lang: Locale
  dict: { common: CommonDictionary }
}

export default function Header({ lang, dict }: HeaderProps) {
	const { setTheme, resolvedTheme, systemTheme } = useTheme()

	// The toggle has two states but the theme has three, and picking either one
	// explicitly used to pin the site for good — a reader who ever pressed this
	// stopped following their system, including when it switches at sunset.
	// Landing back on the system's own appearance therefore stores `system`
	// rather than the matching literal, so following resumes.
	const toggleTheme = () => {
		const next = resolvedTheme === 'dark' ? 'light' : 'dark'
		setTheme(next === systemTheme ? 'system' : next)
	}

	// CSS-based icon switching - no hydration mismatch since visibility is controlled by CSS
	const RenderThemeChanger = () => {
		return (
			<button
				type="button"
				aria-label={dict.common.ToggleTheme}
				title={dict.common.ToggleTheme}
				onClick={toggleTheme}
				className="relative p-2 rounded-lg hover:bg-site-surface-muted transition-colors"
			>
				{/* Sun icon - visible in light mode, hidden in dark mode */}
				<Brightness5Icon aria-hidden className="w-5 h-5 text-site-muted scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 dark:absolute" />
				{/* Moon icon - hidden in light mode, visible in dark mode */}
				<Brightness4Icon aria-hidden className="absolute top-2 left-2 w-5 h-5 text-site-muted scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 dark:relative dark:top-0 dark:left-0" />
			</button>
		)
	}

	return (
		<header className="sticky top-0 z-40 bg-site-header backdrop-blur-sm border-b border-site-line">
			<div className="max-w-4xl mx-auto px-4 md:px-6">
				<Navbar
					lang={lang}
					dict={dict}
					siteTitle={process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'}
					RenderThemeChanger={RenderThemeChanger}
				/>
			</div>
		</header>
	)
}
