'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import zhDict from '@/lib/dictionaries/zh.json'
import enDict from '@/lib/dictionaries/en.json'
import { Locale, i18n, getLocalePath } from '@/lib/i18n-config'

// The root layout lives under the dynamic [lang] segment, so a not-found
// boundary renders in Next's bare error shell — without the [lang] layout, its
// <html lang>, or the next-themes provider. Reading the locale from a server
// API would also opt the whole [lang] tree out of static rendering. So this 404
// is self-contained: it detects the locale from the URL and reproduces the
// site's class-based dark mode itself, on the client, after mount.
export default function NotFound() {
	const [lang, setLang] = useState<Locale>(i18n.defaultLocale)

	useEffect(() => {
		const locale: Locale = window.location.pathname.startsWith('/en') ? 'en' : 'zh'
		// Intentional post-mount setState: the server and first client render must
		// match (both use the default locale) to avoid a hydration mismatch, so the
		// real locale can only be applied once window.location is readable.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLang(locale)
		document.documentElement.lang = locale

		const stored = localStorage.getItem('theme')
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		const isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark)
		document.documentElement.classList.toggle('dark', isDark)
	}, [])

	const dict = lang === 'en' ? enDict : zhDict
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100">
			<header className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
				<Link
					href={getLocalePath(lang)}
					className="text-xl font-medium tracking-wide transition-colors hover:text-blue-600 dark:hover:text-blue-400"
				>
					{siteTitle}
				</Link>
			</header>

			<main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
				<p className="select-none font-mono text-7xl font-bold leading-none tracking-tighter text-gray-200 sm:text-9xl dark:text-gray-800">
					404
				</p>
				<h1 className="mt-6 text-2xl font-bold sm:text-3xl">{dict.common.NotFoundTitle}</h1>
				<p className="mt-3 text-gray-500 dark:text-gray-400">{dict.common.NotFoundMessage}</p>
				<Link
					href={getLocalePath(lang)}
					className="mt-8 inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
				>
					{dict.common.BackHome}
				</Link>
			</main>
		</div>
	)
}
