'use client'

import { useSyncExternalStore } from 'react'
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

// Nothing to subscribe to: the snapshot only tells the server render (false)
// apart from the hydrated client (true).
const subscribeToNothing = () => () => {}

export default function Header({ lang, dict }: HeaderProps) {
	const { setTheme, resolvedTheme, systemTheme } = useTheme()

	// The theme is only known in the browser, so the toggle reports no pressed
	// state until hydration has finished and the two renders agree.
	const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
	const isDark = hydrated ? resolvedTheme === 'dark' : undefined

	// The toggle has two states but the theme has three, and picking either one
	// explicitly used to pin the site for good — a reader who ever pressed this
	// stopped following their system, including when it switches at sunset.
	// Landing back on the system's own appearance therefore stores `system`
	// rather than the matching literal, so following resumes.
	const toggleTheme = () => {
		const next = resolvedTheme === 'dark' ? 'light' : 'dark'
		setTheme(next === systemTheme ? 'system' : next)
	}

	// CSS-based icon switching - no hydration mismatch since visibility is
	// controlled by CSS. The display classes sit on wrappers because MUI's own
	// display rule outranks them on the icons themselves. 44px in the phone bar
	// like its neighbours, 36px in the desktop row.
	const RenderThemeChanger = () => {
		return (
			<button
				type="button"
				aria-label={dict.common.DarkMode}
				aria-pressed={isDark}
				title={dict.common.ToggleTheme}
				onClick={toggleTheme}
				className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-site-muted transition-colors hover:bg-site-surface-muted md:min-h-9 md:min-w-9"
			>
				{/* Sun icon - visible in light mode, hidden in dark mode */}
				<span aria-hidden className="flex dark:hidden">
					<Brightness5Icon fontSize="small" />
				</span>
				{/* Moon icon - hidden in light mode, visible in dark mode */}
				<span aria-hidden className="hidden dark:flex">
					<Brightness4Icon fontSize="small" />
				</span>
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
