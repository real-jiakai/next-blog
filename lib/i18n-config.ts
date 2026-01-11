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
	const cleanPath = path.startsWith('/') ? path : `/${path}`
	if (locale === i18n.defaultLocale) {
		return cleanPath || '/'
	}
	return `/${locale}${cleanPath}`
}
