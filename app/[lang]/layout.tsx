import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { getLocalePath, i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import '@/app/globals.css'
import '@/public/css/prism-night-owl.css'

// Only the locales returned below are valid for this segment. Without this,
// an arbitrary first path component (for example `/fr`) reaches dictionary
// lookup as if it were a locale and produces a 500 instead of a 404.
export const dynamicParams = false

export async function generateStaticParams() {
	return i18n.locales.map((lang) => ({ lang }))
}

const defaultDescriptions: Record<Locale, string> = {
	zh: '专注于分享互联网上有趣的内容。',
	en: 'Discovering and sharing interesting things from around the web.',
}

export async function generateMetadata({
	params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'
	const description = (
		(lang === 'en'
			? process.env.NEXT_PUBLIC_SITE_DESCRIPTION_EN
			: process.env.NEXT_PUBLIC_SITE_DESCRIPTION_ZH) ||
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
		defaultDescriptions[lang]
	)
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
			languages: {
				'zh-CN': '/',
				'en-US': '/en',
				'x-default': '/',
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: {
			type: 'website',
			title: siteTitle,
			description,
			siteName: siteTitle,
			locale: lang === 'zh' ? 'zh_CN' : 'en_US',
			alternateLocale: lang === 'zh' ? ['en_US'] : ['zh_CN'],
		},
		twitter: {
			card: 'summary',
			title: siteTitle,
			description,
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
		<html lang={lang} suppressHydrationWarning>
			<head>
				<script
					async
					src="https://umami.gujiakai.top/script.js"
					data-website-id="89984862-f5d1-4d17-9cb1-54c121ea604d"
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
