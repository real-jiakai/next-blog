import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import readingTime from 'reading-time'
import { i18n, Locale, getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import {
	getAllPostMetadata,
	getPostDataByFileName,
	getPostFilenameByParams,
	getSortedPostsData,
} from '@/lib/posts'
import ArticleLayout from '@/components/ArticleLayout'
import ArticleContent from '@/components/ArticleContent'
import Date from '@/components/Date'
import ArticleToc from '@/components/ArticleToc'
import Comment from '@/components/Comment'
import DynamicAPlayer from '@/components/APlayer/DynamicAPlayer'
import { renderPostMarkdown } from '@/lib/renderPost'
import postImageDimensions from '@/lib/post-image-dimensions.json'

const ARTICLE_CONTAINER_ID = 'article-content'

// reading-time counts each CJK character as a word; Chinese is read at
// roughly 300 characters a minute against ~200 English words.
const WORDS_PER_MINUTE: Record<Locale, number> = { zh: 300, en: 200 }

const knownImageDimensions: Record<string, { width: number; height: number }> =
	postImageDimensions

interface PostParams {
  lang: Locale
  year: string
  month: string
  slug: string
}

export async function generateStaticParams({
	params,
}: {
	params: {
		lang: string
		year?: string
		month?: string
		slug?: string
	}
}) {
	if (!i18n.locales.includes(params.lang as Locale)) return []
	const allPostMetadata = getAllPostMetadata(params.lang as Locale)

	return allPostMetadata.map((post) => ({
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

	if (!postData) {
		notFound()
	}

	const siteUrl = (
		process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top'
	).replace(/\/$/, '')
	const postPath = `/${year}/${month}/${encodeURIComponent(slug)}`
	const translated =
		getPostFilenameByParams(year, month, slug, lang === 'zh' ? 'en' : 'zh') !== null
	const url = `${siteUrl}${getLocalePath(lang, postPath)}`
	const localizedSiteDescription =
		lang === 'zh'
			? process.env.NEXT_PUBLIC_SITE_DESCRIPTION_ZH
			: process.env.NEXT_PUBLIC_SITE_DESCRIPTION_EN
	const description =
		postData.summary ||
		localizedSiteDescription ||
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION
	// Issues open with a cover image; earlier ones without any keep a
	// text-only card. Relative sources resolve against metadataBase.
	const cover = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)/.exec(postData.contentMarkdown)
	const images = cover
		? [{ url: cover[2], alt: cover[1] || postData.title, ...knownImageDimensions[cover[2]] }]
		: undefined

	return {
		title: postData.title,
		description,
		alternates: {
			canonical: url,
			// Only a post published in both languages has a counterpart to point at.
			languages: translated ? getLanguageAlternates(postPath, siteUrl) : undefined,
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: {
			type: 'article',
			title: postData.title,
			description,
			url,
			siteName: process.env.NEXT_PUBLIC_SITE_TITLE,
			locale: lang === 'zh' ? 'zh_CN' : 'en_US',
			alternateLocale: translated ? (lang === 'zh' ? ['en_US'] : ['zh_CN']) : undefined,
			publishedTime: postData.date,
			images,
		},
		twitter: {
			card: images ? 'summary_large_image' : 'summary',
			title: postData.title,
			description,
			images,
		},
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

	// A missing post must return a real 404, not a 200 with a message (which
	// search engines index as a valid, empty page).
	if (!postData) {
		notFound()
	}

	const stats = readingTime(postData.contentMarkdown, {
		wordsPerMinute: WORDS_PER_MINUTE[lang],
	})
	const { content, headings } = renderPostMarkdown(postData.contentMarkdown, lang)
	const githubRepository =
		process.env.NEXT_PUBLIC_GITHUB_REPO ||
		'https://github.com/real-jiakai/next-blog'

	// Get all posts sorted by date (newest first) for this locale
	const allPosts = getSortedPostsData(lang)

	// Find current post index
	const currentIndex = allPosts.findIndex((post) => {
		const postDate = post.date.split('-')
		const postYear = postDate[0]
		const postMonth = postDate[1].padStart(2, '0')
		return post.slug === slug && postYear === year && postMonth === month
	})

	// Navigation: Previous = older post (#18 before #19), Next = newer post (#20 after #19)
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
			{/* Same container as the site header (max-w-4xl + px) so the article
			    column lines up with the nav; the TOC hangs in the right margin. */}
			<div className="max-w-4xl mx-auto px-4 md:px-6">
				<div className="relative">
					{/* Main content area */}
					<article className="min-w-0 pt-4 pb-16">
						{/* Title */}
						<h1 className="my-6 text-4xl sm:text-5xl font-bold tracking-tight text-site-heading">
							{postData.title}
						</h1>

						{/* Meta info */}
						<p className="mt-4 text-sm text-site-muted">
							<Date dateString={postData.date} format="YYYY-M-D" locale={lang} />
							<span className="mx-2">·</span>
							{Math.ceil(stats.minutes)} {dict.common.MinuteRead}
							<span className="mx-2">·</span>
							<a
								href={`${githubRepository}/edit/main/posts/${lang}/${encodeURIComponent(postData.filename)}`}
								className="hover:text-blue-500 dark:hover:text-blue-400"
								target="_blank"
								rel="noopener noreferrer"
							>
								{dict.common.EditThisPage}
							</a>
						</p>

						{/* Audio player */}
						{postData.audio && (
							<div className="mt-8 mb-4">
								<p className="text-sm font-medium text-site-heading mb-2">
									{dict.common.WeeklyBGM}{postData.audio.name} — {postData.audio.artist}
								</p>
								<DynamicAPlayer
									audio={postData.audio}
									loadingLabel={dict.common.LoadingAudio}
									fallbackLabel={dict.common.PlayAudioFallback}
									playLabel={dict.common.PlayPauseAudio}
								/>
							</div>
						)}

						{/* Divider */}
						<hr className="my-8 border-site-line" />

						{/* Article body */}
						<ArticleContent
							content={content}
							containerId={ARTICLE_CONTAINER_ID}
							openLabel={dict.common.OpenImage}
							lightboxLabels={dict.lightbox}
						/>

						{/* Previous/Next navigation */}
						{/* Previous hugs the left edge, next the right, both vertically
						    centred so a title that wraps onto two lines still sits level
						    with a one-line title opposite. The auto margins do the
						    pushing, so a post with only one neighbour still lands on its
						    own side without an empty placeholder to prop it up. */}
						<nav
							aria-label={dict.common.PostNavigation}
							className="mt-16 flex items-center gap-8 border-t border-site-line pt-6"
						>
							{prevPostData ? (
								<Link
									href={getLocalePath(lang, `/${prevPostData.year}/${prevPostData.month}/${prevPostData.slug}`)}
									className="group mr-auto flex max-w-[45%] flex-col"
								>
									<span className="text-sm text-site-muted">
										← {dict.common.PreviousPost}
									</span>
									<span className="mt-1 font-medium text-blue-600 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300">
										{prevPostData.title}
									</span>
								</Link>
							) : null}
							{nextPostData ? (
								<Link
									href={getLocalePath(lang, `/${nextPostData.year}/${nextPostData.month}/${nextPostData.slug}`)}
									className="group ml-auto flex max-w-[45%] flex-col text-right"
								>
									<span className="text-sm text-site-muted">
										{dict.common.NextPost} →
									</span>
									<span className="mt-1 font-medium text-blue-600 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300">
										{nextPostData.title}
									</span>
								</Link>
							) : null}
						</nav>

						{/* Comments */}
						{process.env.NEXT_PUBLIC_SHOW_COMMENT === 'true' && (
							<section className="mt-16 pt-8 border-t border-site-line">
								<Comment dict={dict.comment} lang={lang} />
							</section>
						)}
					</article>

					{/* Table of contents - floats in the right margin beside the
					    article; only shown when the viewport has room for it */}
					<aside className="hidden min-[88rem]:block absolute inset-y-0 left-full w-56 pl-8">
						<div className="sticky top-24">
							<ArticleToc
								headings={headings}
								showtoc={postData.showtoc}
								tocLabel={dict.common.TOC}
								title={postData.title}
							/>
						</div>
					</aside>
				</div>
			</div>
		</ArticleLayout>
	)
}
