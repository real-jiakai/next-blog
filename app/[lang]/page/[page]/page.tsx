import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { i18n, Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import { getPostsPerPage, parsePageNumber } from '@/lib/site-config'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import Pagination from '@/components/Pagination'

interface PageParams {
  lang: Locale
  page: string
}

export async function generateStaticParams({
	params,
}: {
	params: { lang: string; page?: string }
}) {
	const postsPerPage = getPostsPerPage()
	if (!i18n.locales.includes(params.lang as Locale)) return []
	const allPostsData = getSortedPostsData(params.lang as Locale)
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)
	const paths: Array<{ page: string }> = []

	for (let page = 2; page <= totalPages; page++) {
		paths.push({ page: page.toString() })
	}

	return paths
}

export async function generateMetadata({
	params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
	const { lang, page } = await params
	const currentPage = parsePageNumber(page)
	const postsPerPage = getPostsPerPage()
	const totalPages = Math.ceil(getSortedPostsData(lang).length / postsPerPage)

	if (currentPage === null || currentPage > totalPages) {
		notFound()
	}

	const pagePath = currentPage === 1 ? '' : `/page/${currentPage}`
	return {
		title:
			currentPage === 1
				? process.env.NEXT_PUBLIC_SITE_TITLE
				: lang === 'zh'
					? `第 ${currentPage} 页`
					: `Page ${currentPage}`,
		alternates: {
			canonical: getLocalePath(lang, pagePath),
			languages: {
				'zh-CN': getLocalePath('zh', pagePath),
				'en-US': getLocalePath('en', pagePath),
				'x-default': getLocalePath('zh', pagePath),
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
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
	const currentPage = parsePageNumber(page)
	const postsPerPage = getPostsPerPage()
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)

	if (currentPage === 1) {
		permanentRedirect(getLocalePath(lang))
	}
	if (currentPage === null || currentPage > totalPages) {
		notFound()
	}

	const startIndex = (currentPage - 1) * postsPerPage
	const endIndex = startIndex + postsPerPage
	const postsToRender = allPostsData.slice(startIndex, endIndex)

	return (
		<Layout lang={lang} dict={dict}>
			{/* Same elastic list as the homepage: leftover height turns into even
			    spacing between cards (matters on the shorter last page too) */}
			<section className="max-w-4xl mx-auto flex w-full flex-1 flex-col px-4 md:px-6">
				<div className="flex w-full flex-1 flex-col">
					<div className="flex w-full flex-1 flex-col justify-evenly gap-2.5">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
					<Pagination
						lang={lang}
						currentPage={currentPage}
						totalPages={totalPages}
						previousLabel={dict.common.PreviousPage}
						nextLabel={dict.common.NextPage}
					/>
				</div>
			</section>
		</Layout>
	)
}
