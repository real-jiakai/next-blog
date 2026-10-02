import { i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { getSortedPostsData } from '@/lib/posts'
import { getPostsPerPage } from '@/lib/site-config'

export function getPageCount(locale: Locale): number {
	return Math.ceil(getSortedPostsData(locale).length / getPostsPerPage())
}

// Page N is a translation of the other locale's page N only while both have
// one. Past that, an hreflang link would point at a 404.
export function isPageInEveryLocale(page: number): boolean {
	return i18n.locales.every((locale) => page <= getPageCount(locale))
}
