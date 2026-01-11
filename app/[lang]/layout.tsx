import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import Script from 'next/script'
import { i18n, Locale } from '@/lib/i18n-config'
import '@/app/globals.css'
import '@/public/css/prism-night-owl.css'
import '@/public/css/APlayer.min.css'

export async function generateStaticParams() {
	return i18n.locales.map((lang) => ({ lang }))
}

export const metadata: Metadata = {
	title: {
		default: process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog',
		template: `%s | ${process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'}`,
	},
	description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
	keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS,
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
				<Script src="/js/APlayer.min.js" strategy="beforeInteractive" />
			</body>
		</html>
	)
}
