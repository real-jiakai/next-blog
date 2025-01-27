import Head from 'next/head'
import Link from 'next/link'
import Layout from 'components/Layout'
import Date from 'components/Date'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import { getSortedPostsData } from 'lib/posts'
import generateRSSFeed from 'lib/generateRSSFeed'

export default function Home({ allPostsData }) {
	const totalPages = Math.ceil(allPostsData.length / parseInt(process.env.NEXT_PUBLIC_POSTS_PERPAGE))
	const postsToRender = allPostsData.slice(0, process.env.NEXT_PUBLIC_POSTS_PERPAGE)
	
	return (
		<Layout>
			<Head>
				<title>{process.env.NEXT_PUBLIC_SITE_TITLE}</title>
			</Head>

			<section className="max-w-2xl mx-auto px-4">
				<div className="min-h-[calc(100vh-12rem)] flex flex-col justify-between">
					<div className="space-y-4 flex-grow">
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
														{tags.map((tag, index) => (
															<Link
																key={index}
																href={`/tag/${tag}`}
																className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
															>
																{index > 0 ? ' · ' : ''}#{tag}
															</Link>
														))}
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
						<span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"> 1 / {totalPages}</span>
						{totalPages > 1 && (
							<Link
								href={`/page/${1 + 1}`}
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

export async function getStaticProps() {
	const allPostsData = getSortedPostsData()

	await generateRSSFeed(allPostsData)
	return {
		props: {
			allPostsData
		}
	}
}
