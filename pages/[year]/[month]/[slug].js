import Head from 'next/head'
import Link from 'next/link'
import readingTime from 'reading-time'
import { useState, useEffect } from 'react'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ArticleIcon from '@mui/icons-material/Article'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArticleLayout from 'components/ArticleLayout'
import Date from 'components/Date'
import ArticleToc from 'components/ArticleToc'
import AISummary from 'components/AISummary'
import Comment from 'components/Comment'
import ScrollToTop from 'components/ScrollToTop'
import { getAllPostMetadata, getPostDataByFileName, getSortedPostsData } from 'lib/posts'
import useTranslation from 'next-translate/useTranslation'

export default function Post({ postData, params, stats, prevPost, nextPost }) {
	const { t } = useTranslation('common')
	const [ap, setAp] = useState(null)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		const initializeAPlayer = () => {
			if (mounted && typeof window !== 'undefined' && window.APlayer && postData.audio && !ap) {
				const player = new APlayer({
					container: document.getElementById('aplayer'),
					audio: [postData.audio],
				})

				setAp(player)
			}
		}

		initializeAPlayer()

		return () => {
			if (ap) {
				ap.destroy()
			}
		}
	}, [ap, postData, mounted])


	return (
		<ArticleLayout>
			{/* 标题 */}
			<Head>
				<title>{postData.title}</title>
			</Head>

			{/* 主体 */}
			<div className="flex flex-col lg:grid lg:grid-cols-6 lg:gap-2">
				{/* chatgpt总结 */}
				<div className="hidden xl:block md:col-span-1 order-1 md:order-1">
					{process.env.NEXT_PUBLIC_AI_SUMMARY_AVAILABLE && (
						<div className='md:sticky top-1/4 bottom-1/4 p-2 bg-gray-300 shadow-lg rounded-md dark:text-gray-900 mx-auto md:mx-0 w-full md:w-auto'>
							<AISummary contentMarkdown={postData.contentMarkdown} params={params} tags={postData.tags} />
						</div>
					)}
				</div>

				<div className="col-span-5 mx-auto md:mx-10 order-2 md:order-2 p-4">
					<div className="grid grid-cols-5 gap-4">
						{/* 文章内容 */}
						<article className="col-span-5 md:col-span-4 leading-relaxed tracking-wide px-4 md:px-0">
							<h1 className="text-3xl font-semibold text-center my-3">{postData.title}</h1>
							<div className="flex flex-wrap text-base my-3">
								<div className="text-right flex-1 hidden lg:block">
									<ArticleIcon />{' '}{stats.words} words
								</div>
								<div className="text-right flex-1 hidden lg:block">
									<AccessTimeIcon />{' '}{Math.ceil(stats.minutes)} min
								</div>
								<div className="text-right flex-1 hidden lg:block">
									<CalendarTodayIcon />{' '}<Date dateString={postData.date} format='YYYY-M-D' />
								</div>
								<div className="text-right flex-1 hidden lg:block">
									<a href={`${process.env.NEXT_PUBLIC_GITHUB_REPO}/edit/main/posts/${encodeURIComponent(postData.filename)}`} className='hover:text-blue-800' target='_blank'>
										Edit This Page
									</a>
								</div>
							</div>

							<div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} className='tracking-wide leading-loose' />
							{mounted && postData.audio && <div id="aplayer" />}
							<div className="my-12 mx-0">
								<div className="grid grid-cols-2 gap-4">
									{prevPost ? (
										<Link
											href={`/${prevPost.year}/${prevPost.month}/${prevPost.slug}`}
											className="group flex flex-col items-start overflow-hidden"
										>
											<span className="text-sm text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-500">← {t('PreviousPost')}</span>
											<span className="text-gray-900 dark:text-gray-100 truncate w-full group-hover:text-blue-500">{prevPost.title}</span>
										</Link>
									) : <div />}
									{nextPost ? (
										<Link
											href={`/${nextPost.year}/${nextPost.month}/${nextPost.slug}`}
											className="group flex flex-col items-end text-right overflow-hidden"
										>
											<span className="text-sm text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-500">{t('NextPost')} →</span>
											<span className="text-gray-900 dark:text-gray-100 truncate w-full group-hover:text-blue-500">{nextPost.title}</span>
										</Link>
									) : <div />}
								</div>
							</div>
							{/* 评论组件容器 */}
							<div className="max-w-full overflow-x-auto">
								{process.env.NEXT_PUBLIC_SHOW_COMMENT === 'true' ? <Comment /> : null}
							</div>
						</article>

						{/* 文章目录 */}
						<div className="hidden xl:block">
							<ArticleToc contentMarkdown={postData.contentMarkdown} showtoc={postData.showtoc} />
						</div>
					</div>
				</div>
			</div>
			{/* 回到顶部 */}
			<ScrollToTop />
		</ArticleLayout>
	)
}

export async function getStaticPaths({ locales }) {
	const allPostMetadata = getAllPostMetadata()
	const paths = allPostMetadata.map((post) => locales.map(
		(locale) => ({
			params: {
				year: post.year.toString(),
				month: post.month.toString().padStart(2, '0'),
				slug: post.slug,
			},
			locale,
		}))).flat()

	return {
		paths,
		fallback: false,
	}
}

export async function getStaticProps({ params }) {
	const postData = await getPostDataByFileName(params.year, params.month, params.slug)
	const stats = readingTime(postData.contentMarkdown)

	// Get all posts sorted by date (newest first)
	const allPosts = getSortedPostsData()

	// Find current post index by matching slug from frontmatter
	const currentIndex = allPosts.findIndex(post => {
		const postDate = post.date.split('-')
		const postYear = postDate[0]
		const postMonth = postDate[1].padStart(2, '0')
		return post.slug === params.slug &&
			postYear === params.year &&
			postMonth === params.month
	})

	// For newest post (index 0), only show older post (next)
	// For oldest post (last index), only show newer post (prev)
	const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
	const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

	return {
		props: {
			postData,
			params,
			stats,
			prevPost: prevPost ? {
				title: prevPost.title,
				year: prevPost.date.split('-')[0],
				month: prevPost.date.split('-')[1].padStart(2, '0'),
				slug: prevPost.slug  // Use slug from frontmatter
			} : null,
			nextPost: nextPost ? {
				title: nextPost.title,
				year: nextPost.date.split('-')[0],
				month: nextPost.date.split('-')[1].padStart(2, '0'),
				slug: nextPost.slug  // Use slug from frontmatter
			} : null
		}
	}
}
