import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import PostCard from '@/components/PostCard'
import { getPostsPerPage } from '@/lib/site-config'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	return {
		title: process.env.NEXT_PUBLIC_SITE_TITLE,
		alternates: {
			canonical: getLocalePath(lang),
			languages: {
				'zh-CN': getLocalePath('zh'),
				'en-US': getLocalePath('en'),
				'x-default': getLocalePath('zh'),
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
	}
}

export default async function Home({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const allPostsData = getSortedPostsData(lang)
	const postsPerPage = getPostsPerPage()
	const totalPages = Math.ceil(allPostsData.length / postsPerPage)
	const postsToRender = allPostsData.slice(0, postsPerPage)

	// Show message if no posts for this locale
	if (allPostsData.length === 0) {
		return (
			<Layout lang={lang} dict={dict}>
				<section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
					<div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center">
						<p className="text-gray-600 dark:text-gray-300 text-lg">
							{dict.common.NoPostsAvailable || 'No posts available in this language yet.'}
						</p>
					</div>
				</section>
			</Layout>
		)
	}

	return (
		<Layout lang={lang} dict={dict}>
			<section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 w-full flex-1 flex flex-col">
				<div className="w-full flex-1 flex flex-col">
					<div className="w-full space-y-3 md:space-y-4">
						{postsToRender.map((post) => (
							<PostCard key={post.slug} lang={lang} post={post} />
						))}
					</div>
					<nav
						aria-label={lang === 'zh' ? '分页' : 'Pagination'}
						className="mt-6 flex flex-wrap items-center justify-center gap-2 pb-2 text-sm"
					>
						<span
							aria-current="page"
							className="inline-flex min-h-11 items-center px-3 font-mono text-xs tracking-wide text-site-muted"
						>
							1 / {totalPages}
						</span>
						{totalPages > 1 && (
							<Link
								rel="next"
								href={getLocalePath(lang, '/page/2')}
								className="inline-flex min-h-11 items-center gap-2 rounded-full border border-site-line bg-site-surface px-4 font-medium text-site-heading shadow-sm transition-colors hover:bg-site-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
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
