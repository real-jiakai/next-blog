import type { MetadataRoute } from 'next'
import { i18n, Locale, getLocalePath } from '@/lib/i18n-config'
import { getSortedPostsData, getAllTags } from '@/lib/posts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top'

export default function sitemap(): MetadataRoute.Sitemap {
	const entries: MetadataRoute.Sitemap = []
	const postsPerPage = parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE || '10')

	for (const locale of i18n.locales) {
		// Home page
		entries.push({
			url: `${baseUrl}${getLocalePath(locale)}`,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1,
		})

		// About page
		entries.push({
			url: `${baseUrl}${getLocalePath(locale, '/about')}`,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 0.8,
		})

		// Archive page
		entries.push({
			url: `${baseUrl}${getLocalePath(locale, '/archive')}`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.7,
		})

		// All posts
		const posts = getSortedPostsData(locale)
		for (const post of posts) {
			const [year, month] = post.date.split('-')
			entries.push({
				url: `${baseUrl}${getLocalePath(locale, `/${year}/${month}/${post.slug}`)}`,
				lastModified: new Date(post.date),
				changeFrequency: 'monthly',
				priority: 0.6,
			})
		}

		// Pagination pages
		const totalPages = Math.ceil(posts.length / postsPerPage)
		for (let i = 2; i <= totalPages; i++) {
			entries.push({
				url: `${baseUrl}${getLocalePath(locale, `/page/${i}`)}`,
				lastModified: new Date(),
				changeFrequency: 'daily',
				priority: 0.5,
			})
		}

		// Tag pages
		const tags = getAllTags(locale)
		for (const tag of tags) {
			entries.push({
				url: `${baseUrl}${getLocalePath(locale, `/tag/${tag}`)}`,
				lastModified: new Date(),
				changeFrequency: 'weekly',
				priority: 0.5,
			})
		}
	}

	return entries
}
