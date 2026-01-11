import type { Metadata } from 'next'
import Link from 'next/link'
import readingTime from 'reading-time'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import {
	getAllPostMetadataAllLocales,
	getPostDataByFileName,
	getSortedPostsData,
} from '@/lib/posts'
import ArticleLayout from '@/components/ArticleLayout'
import Date from '@/components/Date'
import ArticleToc from '@/components/ArticleToc'
import Comment from '@/components/Comment'
import ScrollToTop from '@/components/ScrollToTop'
import DynamicAPlayer from '@/components/APlayer/DynamicAPlayer'

interface PostParams {
  lang: Locale
  year: string
  month: string
  slug: string
}

export async function generateStaticParams() {
	const allPostMetadata = getAllPostMetadataAllLocales()

	return allPostMetadata.map((post) => ({
		lang: post.locale,
		year: post.year.toString(),
		month: post.month.toString().padStart(2, '0'),
		slug: post.slug,
	}))
}

export async function generateMetadata({
	params,
}: {
  params: Promise<PostParams>
}): Promise<Metadata> {
	const { lang, year, month, slug } = await params
	const postData = await getPostDataByFileName(year, month, slug, lang)
	return {
		title: postData?.title || 'Post',
	}
}

export default async function Post({
	params,
}: {
  params: Promise<PostParams>
}) {
	const { lang, year, month, slug } = await params
	const dict = await getDictionary(lang)
	const postData = await getPostDataByFileName(year, month, slug, lang)

	if (!postData) {
		return (
			<ArticleLayout lang={lang} dict={dict}>
				<div className="flex flex-col items-center justify-center min-h-[50vh]">
					<p className="text-gray-600 dark:text-gray-300 text-lg">
						{dict.common.PostNotFound || 'Post not found in this language.'}
					</p>
				</div>
			</ArticleLayout>
		)
	}

	const stats = readingTime(postData.contentMarkdown)

	// Get all posts sorted by date (newest first) for this locale
	const allPosts = getSortedPostsData(lang)

	// Find current post index
	const currentIndex = allPosts.findIndex((post) => {
		const postDate = post.date.split('-')
		const postYear = postDate[0]
		const postMonth = postDate[1].padStart(2, '0')
		return post.slug === slug && postYear === year && postMonth === month
	})

	// Navigation: Previous = newer post (#20 after #19), Next = older post (#18 before #19)
	const prevPost =
    currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
	const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

	const prevPostData = prevPost
		? {
			title: prevPost.title,
			year: prevPost.date.split('-')[0],
			month: prevPost.date.split('-')[1].padStart(2, '0'),
			slug: prevPost.slug,
		}
		: null

	const nextPostData = nextPost
		? {
			title: nextPost.title,
			year: nextPost.date.split('-')[0],
			month: nextPost.date.split('-')[1].padStart(2, '0'),
			slug: nextPost.slug,
		}
		: null

	return (
		<ArticleLayout lang={lang} dict={dict}>
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-8">
					{/* Main content area */}
					<article className="min-w-0 pt-4 pb-16">
						{/* Title */}
						<h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
							{postData.title}
						</h1>

						{/* Meta info */}
						<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
							<Date dateString={postData.date} format="YYYY-M-D" />
							<span className="mx-2">·</span>
							{Math.ceil(stats.minutes)} min read
							<span className="mx-2">·</span>
							<a
								href={`${process.env.NEXT_PUBLIC_GITHUB_REPO}/edit/main/posts/${lang}/${encodeURIComponent(postData.filename)}`}
								className="hover:text-blue-500 dark:hover:text-blue-400"
								target="_blank"
							>
								{dict.common.EditThisPage}
							</a>
						</p>

						{/* Audio player */}
						{postData.audio && (
							<div className="mt-8 mb-4">
								<p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
									{dict.common.WeeklyBGM}: {postData.audio.name} - {postData.audio.artist}
								</p>
								<DynamicAPlayer audio={postData.audio} />
							</div>
						)}

						{/* Divider */}
						<hr className="my-8 border-gray-200 dark:border-gray-800" />

						{/* Article body */}
						<div
							dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
							className="article-content"
						/>

						{/* Previous/Next navigation */}
						<nav className="mt-16 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-6">
							{prevPostData ? (
								<Link
									href={getLocalePath(lang, `/${prevPostData.year}/${prevPostData.month}/${prevPostData.slug}`)}
									className="group flex flex-col"
								>
									<span className="text-sm text-gray-500 dark:text-gray-400">
                    ← {dict.common.PreviousPost}
									</span>
									<span className="mt-1 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
										{prevPostData.title}
									</span>
								</Link>
							) : (
								<div />
							)}
							{nextPostData ? (
								<Link
									href={getLocalePath(lang, `/${nextPostData.year}/${nextPostData.month}/${nextPostData.slug}`)}
									className="group flex flex-col text-right"
								>
									<span className="text-sm text-gray-500 dark:text-gray-400">
										{dict.common.NextPost} →
									</span>
									<span className="mt-1 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
										{nextPostData.title}
									</span>
								</Link>
							) : (
								<div />
							)}
						</nav>

						{/* Comments */}
						{process.env.NEXT_PUBLIC_SHOW_COMMENT === 'true' && (
							<section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
								<Comment dict={dict.comment} lang={lang} />
							</section>
						)}
					</article>

					{/* Table of contents - Right sidebar */}
					<aside className="hidden lg:block relative z-0">
						<div className="sticky top-24">
							<ArticleToc
								contentMarkdown={postData.contentMarkdown}
								showtoc={postData.showtoc}
								tocLabel={dict.common.TOC}
							/>
						</div>
					</aside>
				</div>
			</div>
			<ScrollToTop />
		</ArticleLayout>
	)
}
