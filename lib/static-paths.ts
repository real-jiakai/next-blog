import { i18n, getLocalePath } from '@/lib/i18n-config'
import { getAllPostMetadata } from '@/lib/posts'

// Every page URL the build prerenders, in the form visitors request it
// (`/about`, not `/zh/about`). It is derived from the same post data the
// pages' generateStaticParams read, so the two cannot disagree.
function collectStaticPagePaths(): Set<string> {
	const paths = new Set<string>()

	for (const locale of i18n.locales) {
		paths.add(getLocalePath(locale))
		paths.add(getLocalePath(locale, '/about'))

		for (const post of getAllPostMetadata(locale)) {
			const month = String(post.month).padStart(2, '0')
			paths.add(getLocalePath(locale, `/${post.year}/${month}/${post.slug}`))
		}
	}

	return paths
}

let cachedPaths: Set<string> | undefined

export function getStaticPagePaths(): Set<string> {
	// Posts are not part of the module graph, so the dev server would keep an
	// outdated list after a post is added or undrafted (as in lib/posts).
	if (process.env.NODE_ENV === 'development') {
		return collectStaticPagePaths()
	}
	if (!cachedPaths) {
		cachedPaths = collectStaticPagePaths()
	}
	return cachedPaths
}

/**
 * Whether a request pathname names a prerendered page. The pathname may still
 * carry percent-escapes; one that cannot be decoded names no page.
 */
export function isStaticPagePath(pathname: string): boolean {
	let decoded: string
	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return false
	}
	return getStaticPagePaths().has(decoded)
}
