'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import zhDict from '@/lib/dictionaries/zh.json'
import enDict from '@/lib/dictionaries/en.json'
import { Locale, getLocalePath } from '@/lib/i18n-config'
// The global (unmatched-path) boundary renders outside the [lang] layout, so it
// wouldn't otherwise get the site stylesheet. Import it here so both boundaries
// are styled.
import '@/app/globals.css'

// Shared by both the root (app/not-found.tsx — unmatched paths like /88766g) and
// the [lang] (app/[lang]/not-found.tsx — notFound() in matched routes) boundaries.
//
// A not-found boundary renders in Next's bare error shell — without the [lang]
// layout, its <html lang>, or the next-themes provider. usePathname is available
// for the initial Client Component render, preventing an English 404 from first
// rendering Chinese. Theme restoration remains a small client-side enhancement.
export default function NotFound() {
	const pathname = usePathname()
	const lang: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh'

	useEffect(() => {
		document.documentElement.lang = lang

		const stored = localStorage.getItem('theme')
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
		const isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark)
		document.documentElement.classList.toggle('dark', isDark)
	}, [lang])

	const dict = lang === 'en' ? enDict : zhDict
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'
	const homePath = getLocalePath(lang)

	return (
		<div className="flex min-h-svh flex-col bg-site-page text-site-copy">
			{/* The site's bar reduced to its centred name: a way home, and no
			    controls that would need the [lang] layout's providers. */}
			<header className="border-b border-site-line">
				<div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-center px-4">
					<Link
						href={homePath}
						className="inline-flex items-center gap-2 whitespace-nowrap text-xl font-bold tracking-[0.06em] text-site-heading"
					>
						<span aria-hidden className="size-2 bg-site-accent" />
						{siteTitle}
					</Link>
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
				<Link
					href={homePath}
					className="mt-8 inline-block self-start border-b-[1.5px] border-current pb-0.5 text-[0.9375rem] font-semibold text-site-accent transition-colors hover:border-transparent"
				>
					{dict.common.BackHome}<span aria-hidden> →</span>
				</Link>
			</main>
		</div>
	)
}
