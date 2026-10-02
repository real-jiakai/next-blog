import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { display, sans } from '@/lib/fonts'
import { getLanguageAlternates, getLocalePath, i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { getSiteOpenGraph } from '@/lib/metadata'
import { getSiteDescription } from '@/lib/site-config'
import '@/app/globals.css'
import '@/app/prism-night-owl.css'

// Only the locales returned below are valid for this segment. Without this,
// an arbitrary first path component (for example `/fr`) reaches dictionary
// lookup as if it were a locale and produces a 500 instead of a 404.
export const dynamicParams = false

export async function generateStaticParams() {
	return i18n.locales.map((lang) => ({ lang }))
}

// Umami records a view only on these hosts, so dev servers, local builds and
// previews do not count toward the production site's statistics.
const analyticsDomain = new URL(
	process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top',
).hostname

export async function generateMetadata({
	params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'
	const description = getSiteDescription(lang)
	const canonical = getLocalePath(lang)

	return {
		metadataBase: process.env.NEXT_PUBLIC_SITE_URL
			? new URL(process.env.NEXT_PUBLIC_SITE_URL)
			: undefined,
		title: {
			default: siteTitle,
			template: `%s | ${siteTitle}`,
		},
		description,
		keywords: process.env.NEXT_PUBLIC_KEYWORDS,
		alternates: {
			canonical,
			languages: getLanguageAlternates(),
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		// No title or description here: Next fills og:/twitter: title and
		// description from each page's own, so a page that does not set its
		// own card does not present itself as the home page.
		openGraph: getSiteOpenGraph(lang),
		twitter: {
			card: 'summary',
		},
	}
}

export default async function RootLayout({
	children,
	params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params

	return (
		// data-scroll-behavior lets Next turn off the stylesheet's smooth
		// scrolling while it moves a new route to the top (see globals.css).
		<html
			lang={lang}
			suppressHydrationWarning
			className={`${sans.variable} ${display.variable}`}
			data-scroll-behavior="smooth"
		>
			<head>
				<script
					async
					src="https://umami.gujiakai.top/script.js"
					data-website-id="89984862-f5d1-4d17-9cb1-54c121ea604d"
					data-domains={analyticsDomain}
				/>
			</head>
			<body>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	)
}
