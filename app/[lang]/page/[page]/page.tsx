import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { i18n, Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import { getPostsPerPage, parsePageNumber } from '@/lib/site-config'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'

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
			<section className="max-w-5xl mx-auto px-0 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
				<div className="w-full flex-1 flex flex-col">
					<div className="w-full space-y-3 md:space-y-4 flex-1">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
					<div className="flex justify-center py-4 gap-2 text-sm">
						{currentPage > 1 && (
							<Link
								href={currentPage === 2 ? getLocalePath(lang) : getLocalePath(lang, `/page/${currentPage - 1}`)}
								className="px-4 py-2 rounded-lg border border-site-line bg-site-surface text-site-muted transition-colors hover:bg-site-surface-muted hover:text-site-heading"
							>
								{dict.common.PreviousPage}
							</Link>
						)}
						<span className="px-4 py-2 rounded-lg border border-site-line bg-site-surface text-site-muted">
							{currentPage} / {totalPages}
						</span>
						{currentPage < totalPages && (
							<Link
								href={getLocalePath(lang, `/page/${currentPage + 1}`)}
								className="px-4 py-2 rounded-lg border border-site-line bg-site-surface text-site-muted transition-colors hover:bg-site-surface-muted hover:text-site-heading"
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
