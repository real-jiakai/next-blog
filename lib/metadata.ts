import type { Metadata } from 'next'
import { getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'

/**
 * The Open Graph fields every page shares. A page that sets `openGraph`
 * replaces the layout's object whole, so each one restates these. Title and
 * description are left out on purpose: Next fills them from the page's own
 * resolved <title> and description. Pass `path` to publish og:url.
 */
export function getSiteOpenGraph(
	lang: Locale,
	path?: string,
): NonNullable<Metadata['openGraph']> {
	return {
		type: 'website',
		siteName: process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog',
		locale: lang === 'zh' ? 'zh_CN' : 'en_US',
		alternateLocale: lang === 'zh' ? ['en_US'] : ['zh_CN'],
		...(path === undefined ? {} : { url: getLocalePath(lang, path) }),
	}
}
