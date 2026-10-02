import type { Locale } from '@/lib/i18n-config'

const defaultDescriptions: Record<Locale, string> = {
	zh: '专注于分享互联网上有趣的东西。',
	en: 'A weekly collection of interesting things from the internet.',
}

/**
 * The site description in a locale: its own setting, then the shared one,
 * then a built-in default. The meta description and the contents page's
 * tagline both use it.
 */
export function getSiteDescription(lang: Locale): string {
	return (
		(lang === 'en'
			? process.env.NEXT_PUBLIC_SITE_DESCRIPTION_EN
			: process.env.NEXT_PUBLIC_SITE_DESCRIPTION_ZH) ||
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
		defaultDescriptions[lang]
	)
}
