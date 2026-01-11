import type { Metadata } from 'next'
import Link from 'next/link'
import { i18n, Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import Date from '@/components/Date'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'

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
						{postsToRender.map(({ date, slug, title, summary, tags }) => {
							const [year, month] = date.split('-')
							return (
								<article
									key={slug}
									className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
								>
									<div className="px-4 py-3">
										<Link href={getLocalePath(lang, `/${year}/${month}/${slug}`)}>
											<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1.5 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
												{title}
											</h2>
										</Link>
										<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
											<div className="inline-flex items-center gap-1.5">
												<CalendarTodayIcon
													sx={{ fontSize: 16 }}
													className="text-gray-500 dark:text-gray-400"
												/>
												<Date dateString={date} />
											</div>
											{tags && tags.length > 0 && (
												<div className="inline-flex items-center gap-1.5">
													<LocalOfferIcon
														sx={{ fontSize: 16 }}
														className="text-gray-500 dark:text-gray-400"
													/>
													{tags.map((tag: string, index: number) => (
														<Link
															key={index}
															href={getLocalePath(lang, `/tag/${tag}`)}
															className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
														>
															{index > 0 ? ' · ' : ''}#{tag}
														</Link>
													))}
												</div>
											)}
										</div>
										<Link href={getLocalePath(lang, `/${year}/${month}/${slug}`)}>
											<p className="mt-1.5 text-gray-600 dark:text-gray-300 text-sm line-clamp-2 hover:text-gray-800 dark:hover:text-gray-100 cursor-pointer">
												{summary}
											</p>
										</Link>
									</div>
								</article>
							)
						})}
					</div>
					<div className="flex justify-center py-4 gap-2">
						{currentPage > 1 && (
							<Link
								href={currentPage === 2 ? getLocalePath(lang) : getLocalePath(lang, `/page/${currentPage - 1}`)}
								className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-600 dark:text-gray-300"
							>
								{dict.common.PreviousPage}
							</Link>
						)}
						<span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
							{currentPage} / {totalPages}
						</span>
						{currentPage < totalPages && (
							<Link
								href={getLocalePath(lang, `/page/${currentPage + 1}`)}
								className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-600 dark:text-gray-300"
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
