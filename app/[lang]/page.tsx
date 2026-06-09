import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLocalePath, i18n } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import generateRSSFeed from '@/lib/generateRSSFeed'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'

// Generate RSS feeds for all locales at build time
for (const locale of i18n.locales) {
	const localePosts = getSortedPostsData(locale)
	generateRSSFeed(localePosts, locale)
}

export const metadata: Metadata = {
	title: process.env.NEXT_PUBLIC_SITE_TITLE,
}

export default async function Home({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const allPostsData = getSortedPostsData(lang)
	const postsPerPage = parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE || '10')
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)
	const postsToRender = allPostsData.slice(0, postsPerPage)

	// Show message if no posts for this locale
	if (allPostsData.length === 0) {
		return (
			<Layout lang={lang} dict={dict}>
				<section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
						<p className="text-gray-600 dark:text-gray-300 text-lg">
							{dict.common.NoPostsAvailable || 'No posts available in this language yet.'}
						</p>
					</div>
				</section>
			</Layout>
		)
	}

	return (
		<Layout lang={lang} dict={dict}>
			<section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col">
				<div className="w-full flex-1 flex flex-col">
					<div className="w-full space-y-4 flex-1">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
					<div className="flex justify-center py-4 gap-2 text-sm">
						<span className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              1 / {totalPages}
						</span>
						{totalPages > 1 && (
							<Link
								href={getLocalePath(lang, '/page/2')}
								className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
							>
								{dict.common.NextPage}
							</Link>
						)}
					</div>
				</div>
			</section>
		</Layout>
	)
}
