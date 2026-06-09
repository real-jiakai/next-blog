import type { Metadata } from 'next'
import Link from 'next/link'
import { i18n, Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'

interface PageParams {
  lang: Locale
  page: string
}

export async function generateStaticParams() {
	const paths: PageParams[] = []
	const postsPerPage = parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE || '10')

	for (const locale of i18n.locales) {
		const allPostsData = getSortedPostsData(locale)
		const totalPages = Math.ceil(allPostsData.length / postsPerPage)

		for (let i = 1; i <= totalPages; i++) {
			paths.push({
				lang: locale,
				page: i.toString(),
			})
		}
	}

	return paths
}

export async function generateMetadata({
	params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
	const { page } = await params
	const currentPage = parseInt(page)
	return {
		title:
			currentPage === 1
				? process.env.NEXT_PUBLIC_SITE_TITLE
				: `Page ${currentPage}`,
	}
}

export default async function PaginationPage({
	params,
}: {
  params: Promise<PageParams>
}) {
	const { lang, page } = await params
	const dict = await getDictionary(lang)
	const allPostsData = getSortedPostsData(lang)
	const currentPage = parseInt(page)
	const postsPerPage = parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE || '10')
	const startIndex = (currentPage - 1) * postsPerPage
	const endIndex = startIndex + postsPerPage
	const postsToRender = allPostsData.slice(startIndex, endIndex)
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)

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
						{currentPage > 1 && (
							<Link
								href={currentPage === 2 ? getLocalePath(lang) : getLocalePath(lang, `/page/${currentPage - 1}`)}
								className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
							>
								{dict.common.PreviousPage}
							</Link>
						)}
						<span className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
							{currentPage} / {totalPages}
						</span>
						{currentPage < totalPages && (
							<Link
								href={getLocalePath(lang, `/page/${currentPage + 1}`)}
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
