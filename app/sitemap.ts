import type { MetadataRoute } from 'next'
import { i18n, getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { isPageInEveryLocale } from '@/lib/pagination'
import { getSortedPostsData } from '@/lib/posts'
import type { PostData } from '@/lib/posts'
import { getPostsPerPage } from '@/lib/site-config'

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top').replace(
	/\/$/,
	'',
)

function absoluteUrl(locale: Locale, path = ''): string {
	return `${baseUrl}${getLocalePath(locale, path)}`
}

function getPostPath(post: PostData): string {
	const [year, month] = post.date.split('-')
	return `/${year}/${month}/${encodeURIComponent(post.slug)}`
}

// hreflang may only name URLs that exist. A post still in draft or not yet
// translated, or a page number only one locale reaches, gets none.
function languageAlternates(path: string, inEveryLocale = true) {
	return inEveryLocale
		? { languages: getLanguageAlternates(path, baseUrl) }
		: undefined
}

export default function sitemap(): MetadataRoute.Sitemap {
	const entries: MetadataRoute.Sitemap = []
	const postsPerPage = getPostsPerPage()
	const postsByLocale = Object.fromEntries(
		i18n.locales.map((locale) => [locale, getSortedPostsData(locale)]),
	) as Record<Locale, PostData[]>
	const postPathsByLocale = i18n.locales.map(
		(locale) => new Set(postsByLocale[locale].map(getPostPath)),
	)

	for (const locale of i18n.locales) {
		const posts = postsByLocale[locale]
		const latestPostDate = posts[0] ? new Date(posts[0].date) : undefined

		// Home page
		entries.push({
			url: absoluteUrl(locale),
			lastModified: latestPostDate,
			changeFrequency: 'daily',
			priority: 1,
			alternates: languageAlternates(''),
		})

		// About page
		entries.push({
			url: absoluteUrl(locale, '/about'),
			changeFrequency: 'monthly',
			priority: 0.8,
			alternates: languageAlternates('/about'),
		})

		// Archive page
		entries.push({
			url: absoluteUrl(locale, '/archive'),
			lastModified: latestPostDate,
			changeFrequency: 'weekly',
			priority: 0.7,
			alternates: languageAlternates('/archive'),
		})

		// All posts
		for (const post of posts) {
			const postPath = getPostPath(post)
			entries.push({
				url: absoluteUrl(locale, postPath),
				lastModified: new Date(post.date),
				changeFrequency: 'monthly',
				priority: 0.6,
				alternates: languageAlternates(
					postPath,
					postPathsByLocale.every((paths) => paths.has(postPath)),
				),
			})
		}

		// Pagination pages
		const totalPages = Math.ceil(posts.length / postsPerPage)
		for (let i = 2; i <= totalPages; i++) {
			const pagePath = `/page/${i}`
			const newestPostOnPage = posts[(i - 1) * postsPerPage]
			entries.push({
				url: absoluteUrl(locale, pagePath),
				lastModified: newestPostOnPage
					? new Date(newestPostOnPage.date)
					: undefined,
				changeFrequency: 'daily',
				priority: 0.5,
				alternates: languageAlternates(pagePath, isPageInEveryLocale(i)),
			})
		}
	}

	return entries
}
