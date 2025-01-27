import Head from 'next/head'
import Link from 'next/link'
import Layout from 'components/Layout'
import Date from 'components/Date'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import { getSortedPostsData } from 'lib/posts'

export default function Page({ allPostsData,currentPage }) {
	const postsPerPage = parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE)
	const startIndex = (currentPage - 1) * postsPerPage
	const endIndex = startIndex + postsPerPage
	const postsToRender = allPostsData.slice(startIndex, endIndex)

	const totalPages = Math.ceil(allPostsData.length / postsPerPage)

	return (
		<Layout>
			<Head>
				<title>{currentPage === 1 ? `${process.env.NEXT_PUBLIC_SITE_TITLE}` : `Page  ${currentPage}` }</title>
			</Head>
			<section className="max-w-2xl mx-auto px-4">
				<div className="min-h-[calc(100vh-12rem)] flex flex-col justify-between">
					<div className="space-y-4">
						{postsToRender.map(({ date, slug, title, summary, tags }) => {
							const [year, month] = date.split('-')
							return (
								<article
									key={slug}
									className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
								>
									<Link href={`/${year}/${month}/${slug}`}>
										<div className="px-4 py-3">
											<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
												{title}
											</h2>
											<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
												<div className="inline-flex items-center gap-1.5">
													<CalendarTodayIcon sx={{ fontSize: 16 }} className="text-gray-500 dark:text-gray-400" />
													<Date dateString={date} />
												</div>
												{tags && tags.length > 0 && (
													<div className="inline-flex items-center gap-1.5">
														<LocalOfferIcon sx={{ fontSize: 16 }} className="text-gray-500 dark:text-gray-400" />
														<div className="flex flex-wrap gap-1">
															{tags.map(tag => (
																<span
																	key={tag}
																	className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300"
																>
																	{tag}
																</span>
															))}
														</div>
													</div>
												)}
											</div>
											<p className="mt-1.5 text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{summary}</p>
										</div>
									</Link>
								</article>
							)
						})}
					</div>
					<div className="flex justify-center py-4 gap-2">
						{currentPage > 1 && (
							<Link
								href={currentPage === 2 ? '/' : `/page/${parseInt(currentPage) - 1}`}
								className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-600 dark:text-gray-300"
							>
								上一页
							</Link>
						)}
						<span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
							{currentPage} / {totalPages}
						</span>
						{currentPage < totalPages && (
							<Link
								href={`/page/${parseInt(currentPage) + 1}`}
								className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-600 dark:text-gray-300"
							>
								下一页
							</Link>
						)}
					</div>
				</div>
			</section>
		</Layout>
	)
}

export async function getStaticPaths({ locales }) {
	const allPostsData = getSortedPostsData()
	const totalPages = Math.ceil(
	  allPostsData.length / parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE)
	)
  
	let paths = []
  
	for (const locale of locales) {
	  const localePaths = Array.from({ length: totalPages }, (_, i) => ({
			params: { page: (i + 1).toString() },
			locale,
	  }))
	  paths = paths.concat(localePaths)
	}
  
	return {
	  paths,
	  fallback: false,
	}
}  

export async function getStaticProps({ params }) {
	const currentPage = params.page
	const allPostsData = getSortedPostsData()
  
	return {
		props: {
			allPostsData,
			currentPage
		},
	}
}