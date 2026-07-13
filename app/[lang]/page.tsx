import type { Metadata } from 'next'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
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

	// Show message if no posts for this locale
	if (allPostsData.length === 0) {
		return (
			<Layout lang={lang} dict={dict}>
				<section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
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
		<Layout lang={lang} dict={dict} naturalFooter>
			<section className="max-w-4xl mx-auto w-full px-4 md:px-6">
				<div className="w-full">
					<div className="w-full space-y-3">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
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
