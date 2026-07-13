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
		<Layout lang={lang} dict={dict} naturalFooter>
			<section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 w-full">
				<div className="w-full">
					<div className="w-full space-y-3 md:space-y-4">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
					<nav
						aria-label={lang === 'zh' ? '分页' : 'Pagination'}
						className="mx-auto mt-6 grid w-full max-w-sm grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pb-2 text-sm"
					>
						{currentPage > 1 && (
							<Link
								rel="prev"
								href={currentPage === 2 ? getLocalePath(lang) : getLocalePath(lang, `/page/${currentPage - 1}`)}
								className="col-start-1 row-start-1 inline-flex min-h-11 w-full max-w-32 items-center justify-center justify-self-end gap-1.5 whitespace-nowrap rounded-full border border-site-line bg-site-surface px-2 text-xs font-medium text-site-heading shadow-sm transition-colors hover:bg-site-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:max-w-36 sm:px-4 sm:text-sm"
							>
								<span aria-hidden>←</span>
								{dict.common.PreviousPage}
							</Link>
						)}
						<span
							aria-current="page"
							className="col-start-2 row-start-1 inline-flex min-h-11 items-center justify-self-center whitespace-nowrap px-2 font-mono text-xs tracking-wide text-site-muted"
						>
							{currentPage} / {totalPages}
						</span>
						{currentPage < totalPages && (
							<Link
								rel="next"
								href={getLocalePath(lang, `/page/${currentPage + 1}`)}
								className="col-start-3 row-start-1 inline-flex min-h-11 w-full max-w-32 items-center justify-center justify-self-start gap-1.5 whitespace-nowrap rounded-full border border-site-line bg-site-surface px-2 text-xs font-medium text-site-heading shadow-sm transition-colors hover:bg-site-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:max-w-36 sm:px-4 sm:text-sm"
							>
								{dict.common.NextPage}
								<span aria-hidden>→</span>
							</Link>
						)}
					</nav>
				</div>
			</section>
		</Layout>
	)
}
