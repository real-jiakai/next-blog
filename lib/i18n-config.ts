export const i18n = {
	defaultLocale: 'zh',
	locales: ['zh', 'en'],
} as const

export type Locale = (typeof i18n)['locales'][number]

/**
 * Generate locale-aware URL path
 * - Chinese (default): no prefix (e.g., /about, /2025/01/post)
 * - English: /en prefix (e.g., /en/about, /en/2025/01/post)
 */
export function getLocalePath(locale: Locale, path: string = ''): string {
	const cleanPath = path === '' ? '' : path.startsWith('/') ? path : `/${path}`
	if (locale === i18n.defaultLocale) {
		return cleanPath || '/'
	}
	return `/${locale}${cleanPath}`
}

/**
 * hreflang alternates for a path that every locale publishes. The codes are
 * language-only: the English pages are not written for one region, and an
 * `en-US` tag would leave English readers elsewhere matching nothing and
 * falling through to the Chinese x-default.
 */
export function getLanguageAlternates(
	path: string = '',
	baseUrl: string = '',
): Record<Locale | 'x-default', string> {
	return {
		zh: `${baseUrl}${getLocalePath('zh', path)}`,
		en: `${baseUrl}${getLocalePath('en', path)}`,
		'x-default': `${baseUrl}${getLocalePath(i18n.defaultLocale, path)}`,
	}
}
