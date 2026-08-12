import type { Metadata } from 'next'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import PostCard, { listMinHeight } from '@/components/PostCard'
import Pagination from '@/components/Pagination'
import { getPostsPerPage } from '@/lib/site-config'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	return {
		title: process.env.NEXT_PUBLIC_SITE_TITLE,
		alternates: {
			canonical: getLocalePath(lang),
			languages: {
				'zh-CN': getLocalePath('zh'),
				'en-US': getLocalePath('en'),
				'x-default': getLocalePath('zh'),
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
	}
}

export default async function Home({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const allPostsData = getSortedPostsData(lang)
	const postsPerPage = getPostsPerPage()
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)
	const postsToRender = allPostsData.slice(0, postsPerPage)
	// Only a full list is asked to fill the viewport. A short one would have to
	// stretch each card too far to manage it, which changes how the card looks.
	const listFillsPage = postsToRender.length === postsPerPage

	// Show message if no posts for this locale
	if (allPostsData.length === 0) {
		return (
			<Layout lang={lang} dict={dict}>
				<section className="max-w-4xl mx-auto px-4 md:px-6">
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
			{/* The list takes the viewport's leftover height and shares it out
			    among the cards, so the page reaches the footer at any screen size
			    and the pagination always follows the last card. */}
			<section className="max-w-4xl mx-auto flex w-full flex-1 flex-col px-4 md:px-6">
				{/* The list always takes the leftover height, which keeps the
				    pagination at the same place on every page. Only a full list
				    passes that height on to its cards; a short one holds it as
				    empty space rather than stretching three posts to cover it. */}
				<div
					className={`flex w-full flex-1 flex-col gap-3 ${
						listFillsPage ? '[&>article]:flex-1' : ''
					}`}
					style={listMinHeight(postsPerPage)}
				>
					{postsToRender.map((post) => (
						<PostCard key={post.slug} lang={lang} post={post} />
					))}
				</div>
				{/* Deliberately not `flex-1`: the list above absorbs the viewport's
				    leftover height, and if this grew too it would take half of it
				    back and reopen the gap the cards are there to close. */}
				<div className="flex justify-center">
					<Pagination
						lang={lang}
						currentPage={1}
						totalPages={totalPages}
						previousLabel={dict.common.PreviousPage}
						nextLabel={dict.common.NextPage}
					/>
				</div>
			</section>
		</Layout>
	)
}
