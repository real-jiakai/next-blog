import type { Metadata } from 'next'
import { headers } from 'next/headers'

import enDict from '@/lib/dictionaries/en.json'
import zhDict from '@/lib/dictionaries/zh.json'
import { getLocalePath, type Locale } from '@/lib/i18n-config'
import '@/app/globals.css'

const LOCALE_HEADER = 'x-blog-locale'
const restoreTheme = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`

async function getRequestedLocale(): Promise<Locale> {
	return (await headers()).get(LOCALE_HEADER) === 'en' ? 'en' : 'zh'
}

export async function generateMetadata(): Promise<Metadata> {
	const lang = await getRequestedLocale()
	const dict = lang === 'en' ? enDict : zhDict
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'

	return {
		title: `${dict.common.NotFoundTitle} | ${siteTitle}`,
		description: dict.common.NotFoundMessage,
	}
}

export default async function GlobalNotFound() {
	const lang = await getRequestedLocale()
	const dict = lang === 'en' ? enDict : zhDict
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'
	const homePath = getLocalePath(lang)

	return (
		<html lang={lang} suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: restoreTheme }} />
			</head>
			<body>
				<div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100">
					<header className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
						<a
							href={homePath}
							className="text-xl font-medium tracking-wide transition-colors hover:text-blue-600 dark:hover:text-blue-400"
						>
							{siteTitle}
						</a>
					</header>

					<main className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
						<p className="select-none font-mono text-7xl font-bold leading-none tracking-tighter text-gray-200 sm:text-9xl dark:text-gray-800">
							404
						</p>
						<h1 className="mt-6 text-2xl font-bold sm:text-3xl">
							{dict.common.NotFoundTitle}
						</h1>
						<p className="mt-3 text-gray-500 dark:text-gray-400">
							{dict.common.NotFoundMessage}
						</p>
						<a
							href={homePath}
							className="mt-8 inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
						>
							{dict.common.BackHome}
						</a>
					</main>
				</div>
			</body>
		</html>
	)
}
