import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getPostsListByTag, getAllTagsAllLocales } from '@/lib/posts'
import Layout from '@/components/Layout'
import Date from '@/components/Date'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'

interface TagParams {
  lang: Locale
  tag: string
}

export async function generateStaticParams() {
	const allTags = getAllTagsAllLocales()

	return allTags.map(({ tag, locale }) => ({
		lang: locale,
		tag,
	}))
}

export async function generateMetadata({
	params,
}: {
  params: Promise<TagParams>
}): Promise<Metadata> {
	const { tag } = await params
	return {
		title: `Tag: ${tag}`,
	}
}

export default async function TagPage({
	params,
}: {
  params: Promise<TagParams>
}) {
	const { lang, tag } = await params
	const dict = await getDictionary(lang)
	const posts = getPostsListByTag(tag, lang)

	return (
		<Layout lang={lang} dict={dict}>
			<section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-center gap-2 mb-8">
					<LocalOfferIcon className="text-gray-600 dark:text-gray-300" />
					<h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
						{dict.common.PostsWithTag}: {tag}
					</h1>
				</div>
				<div className="min-h-[calc(100vh-16rem)] flex flex-col justify-between">
					<div className="space-y-4 flex-grow">
						{posts.length > 0 ? (
							posts.map((post) => (
								<article
									key={post.slug}
									className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
								>
									<Link href={getLocalePath(lang, `/${post.year}/${post.month}/${post.slug}`)}>
										<div className="px-4 py-3">
											<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
												{post.title}
											</h2>
											<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
												<div className="inline-flex items-center gap-1.5">
													<CalendarTodayIcon
														sx={{ fontSize: 16 }}
														className="text-gray-500 dark:text-gray-400"
													/>
													<Date dateString={post.date} />
												</div>
												{post.tags && post.tags.length > 0 && (
													<div className="inline-flex items-center gap-1.5">
														<LocalOfferIcon
															sx={{ fontSize: 16 }}
															className="text-gray-500 dark:text-gray-400"
														/>
														{post.tags.map((t: string, index: number) => (
															<Link
																key={index}
																href={getLocalePath(lang, `/tag/${t}`)}
																className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
															>
																{index > 0 ? ' · ' : ''}#{t}
															</Link>
														))}
													</div>
												)}
											</div>
											<p className="mt-1.5 text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
												{post.summary}
											</p>
										</div>
									</Link>
								</article>
							))
						) : (
							<p className="text-gray-600 dark:text-gray-300 text-center">
								{dict.common.NoPostsWithTag || 'No posts found with this tag.'}
							</p>
						)}
					</div>
				</div>
			</section>
		</Layout>
	)
}
