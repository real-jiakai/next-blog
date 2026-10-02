import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import readingTime from 'reading-time'
import { i18n, Locale, getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import {
	getAllPostMetadata,
	getIssueIndex,
	getPostDataByFileName,
	getPostFilenameByParams,
} from '@/lib/posts'
import Layout from '@/components/Layout'
import ArticleContent from '@/components/ArticleContent'
import ArticleToc from '@/components/ArticleToc'
import Comment from '@/components/Comment'
import PostHeader from '@/components/PostHeader'
import PostNav from '@/components/PostNav'
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

	// The contents page's order (newest first), so the neighbours here are the
	// rows above and below this issue there. Previous = older (#22 before
	// #23), next = newer.
	const issues = getIssueIndex(lang)
	const currentIndex = issues.findIndex(
		(entry) => entry.slug === slug && entry.date.startsWith(`${year}-${month}-`),
	)
	const prevIssue = currentIndex === -1 ? null : issues[currentIndex + 1] ?? null
	const nextIssue = currentIndex > 0 ? issues[currentIndex - 1] : null

	return (
		<Layout lang={lang} dict={dict}>
			{/* The header's container, so the article's left edge lines up with
			    the bar's. From lg the contents list takes a column of its own
			    beside the 42rem measure; below lg there is none. w-full because
			    <main> is a flex column, where an auto-margined box would
			    otherwise shrink to its content. */}
			<div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 md:px-6 lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:gap-x-12">
				{/* The measure holds below lg too, where the grid does not. */}
				<article className="min-w-0 max-w-[42rem]">
					<PostHeader
						lang={lang}
						dict={dict}
						title={postData.title}
						date={postData.date}
						minutes={Math.ceil(stats.minutes)}
						audio={postData.audio}
					/>

					<ArticleContent
						content={content}
						containerId={ARTICLE_CONTAINER_ID}
						openLabel={dict.common.OpenImage}
						lightboxLabels={dict.lightbox}
					/>

					<footer className="mt-16 border-t border-site-rule pt-5">
						<a
							href={`${githubRepository}/edit/main/posts/${lang}/${encodeURIComponent(postData.filename)}`}
							className="text-[0.8125rem] text-site-muted underline decoration-site-line underline-offset-4 transition-colors hover:text-site-heading hover:decoration-site-accent"
							target="_blank"
							rel="noopener noreferrer"
						>
							{dict.common.EditThisPage}
							<span aria-hidden> ↗</span>
						</a>
						<PostNav dict={dict} prev={prevIssue} next={nextIssue} />
					</footer>

					{process.env.NEXT_PUBLIC_SHOW_COMMENT === 'true' && (
						<section className="mt-16 border-t border-site-line pt-8">
							<Comment dict={dict.comment} lang={lang} />
						</section>
					)}
				</article>

				<aside className="hidden lg:block">
					{/* Sticky 1rem below the h-14 header; keep the two in step. */}
					<div className="sticky top-[4.5rem]">
						<ArticleToc
							headings={headings}
							showtoc={postData.showtoc}
							tocLabel={dict.common.TOC}
						/>
					</div>
				</aside>
			</div>
		</Layout>
	)
}
