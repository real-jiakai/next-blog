import type { Metadata } from 'next'
import { headers } from 'next/headers'

import enDict from '@/lib/dictionaries/en.json'
import zhDict from '@/lib/dictionaries/zh.json'
import { display, sans } from '@/lib/fonts'
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
		<html
			lang={lang}
			suppressHydrationWarning
			className={`${sans.variable} ${display.variable}`}
			data-scroll-behavior="smooth"
		>
			<head>
				<script dangerouslySetInnerHTML={{ __html: restoreTheme }} />
			</head>
			<body>
				{/* The same page as components/NotFound; keep the two in step. */}
				<div className="flex min-h-svh flex-col bg-site-page text-site-copy">
					<header className="border-b border-site-line">
						<div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-center px-4">
							<a
								href={homePath}
								className="inline-flex items-center gap-2 whitespace-nowrap text-xl font-bold tracking-[0.06em] text-site-heading"
							>
								<span aria-hidden className="size-2 bg-site-accent" />
								{siteTitle}
							</a>
						</div>
					</header>

					<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 pb-24 md:px-6">
						<p
							aria-hidden
							className="m-0 select-none font-display text-[6rem] font-semibold leading-none text-site-muted lining-nums tabular-nums sm:text-[8rem]"
						>
							404
						</p>
						<h1 className="m-0 mt-4 text-[1.75rem] font-bold text-site-heading sm:text-[2rem]">
							{dict.common.NotFoundTitle}
						</h1>
						<p className="m-0 mt-3 max-w-[42rem] text-[1.0625rem] text-site-muted">
							{dict.common.NotFoundMessage}
						</p>
						<a
							href={homePath}
							className="mt-8 inline-block self-start border-b-[1.5px] border-current pb-0.5 text-[0.9375rem] font-semibold text-site-accent transition-colors hover:border-transparent"
						>
							{dict.common.BackHome}<span aria-hidden> →</span>
						</a>
					</main>
				</div>
			</body>
		</html>
	)
}
