import type { MetadataRoute } from 'next'
import { i18n, getLocalePath } from '@/lib/i18n-config'
import { getSortedPostsData } from '@/lib/posts'
import { getPostsPerPage } from '@/lib/site-config'

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top').replace(
	/\/$/,
	'',
)

function absoluteUrl(locale: 'zh' | 'en', path = ''): string {
	return `${baseUrl}${getLocalePath(locale, path)}`
}

function languageAlternates(path = ''): Record<string, string> {
	return {
		'zh-CN': absoluteUrl('zh', path),
		'en-US': absoluteUrl('en', path),
		'x-default': absoluteUrl('zh', path),
	}
}

export default function sitemap(): MetadataRoute.Sitemap {
	const entries: MetadataRoute.Sitemap = []
	const postsPerPage = getPostsPerPage()

	for (const locale of i18n.locales) {
		const posts = getSortedPostsData(locale)
		const latestPostDate = posts[0] ? new Date(posts[0].date) : undefined

		// Home page
		entries.push({
			url: absoluteUrl(locale),
			lastModified: latestPostDate,
			changeFrequency: 'daily',
			priority: 1,
			alternates: { languages: languageAlternates() },
		})

		// About page
		entries.push({
			url: absoluteUrl(locale, '/about'),
			changeFrequency: 'monthly',
			priority: 0.8,
			alternates: { languages: languageAlternates('/about') },
		})

		// Archive page
		entries.push({
			url: absoluteUrl(locale, '/archive'),
			lastModified: latestPostDate,
			changeFrequency: 'weekly',
			priority: 0.7,
			alternates: { languages: languageAlternates('/archive') },
		})

		// All posts
		for (const post of posts) {
			const [year, month] = post.date.split('-')
			const postPath = `/${year}/${month}/${encodeURIComponent(post.slug)}`
			entries.push({
				url: absoluteUrl(locale, postPath),
				lastModified: new Date(post.date),
				changeFrequency: 'monthly',
				priority: 0.6,
				alternates: { languages: languageAlternates(postPath) },
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
				alternates: { languages: languageAlternates(pagePath) },
			})
		}
	}

	return entries
}
