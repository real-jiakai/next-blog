import Link from 'next/link'
import useTranslation from 'next-translate/useTranslation'
import Layout from 'components/Layout'
import Date from 'components/Date'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import { getPostsListByTag, getAllTags } from 'lib/posts'

export default function TaggedPosts({ posts, tag }) {
	
	const { t } = useTranslation('common')
	const postsWithTag = t('PostsWithTag')

	return (
		<Layout>
			<section className="max-w-2xl mx-auto px-4">
				<div className="flex items-center justify-center gap-2 mb-8">
					<LocalOfferIcon className="text-gray-600 dark:text-gray-300" />
					<h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{postsWithTag}: {tag}</h1>
				</div>
				<div className="min-h-[calc(100vh-16rem)] flex flex-col justify-between">
					<div className="space-y-4 flex-grow">
						{posts.map((post) => (
							<article
								key={post.slug}
								className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
							>
								<Link href={`/${post.year}/${post.month}/${post.slug}`}>
									<div className="px-4 py-3">
										<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
											{post.title}
										</h2>
										<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
											<div className="inline-flex items-center gap-1.5">
												<CalendarTodayIcon sx={{ fontSize: 16 }} className="text-gray-500 dark:text-gray-400" />
												<Date dateString={post.date} />
											</div>
											{post.tags && post.tags.length > 0 && (
												<div className="inline-flex items-center gap-1.5">
													<LocalOfferIcon sx={{ fontSize: 16 }} className="text-gray-500 dark:text-gray-400" />
													{post.tags.map((tag, index) => (
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
										<p className="mt-1.5 text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{post.summary}</p>
									</div>
								</Link>
							</article>
						))}
					</div>
				</div>
			</section>
		</Layout>
	)
}

export async function getStaticPaths({locales}) {
	const tags = getAllTags()
	const paths = tags.map((tag) => locales.map(locale => ({ params: { tag }, locale }))).flat()
	return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
	const posts = getPostsListByTag(params.tag)

	return {
		props: {
			posts,
			tag: params.tag,
		},
	}
}
