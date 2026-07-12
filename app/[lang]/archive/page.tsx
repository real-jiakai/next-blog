import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import Date from '@/components/Date'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	return {
		title: lang === 'zh' ? '归档' : 'Archive',
		alternates: {
			canonical: getLocalePath(lang, '/archive'),
			languages: {
				'zh-CN': getLocalePath('zh', '/archive'),
				'en-US': getLocalePath('en', '/archive'),
				'x-default': getLocalePath('zh', '/archive'),
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
	}
}

export default async function Archive({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const allPostsData = getSortedPostsData(lang)

	// Group posts by year
	const postsByYear = allPostsData.reduce(
		(acc: Record<string, typeof allPostsData>, post) => {
			const year = post.date.split('-')[0]
			if (!acc[year]) {
				acc[year] = []
			}
			acc[year].push(post)
			return acc
		},
		{}
	)

	// Get all years sorted
	const years = Object.keys(postsByYear).sort((a, b) => parseInt(b) - parseInt(a))

	return (
		<Layout lang={lang} dict={dict}>
			<section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 w-full">
				<div>
					{years.map((year) => (
						<section key={year} id={year} className="mb-12">
							<h2 className="text-2xl font-bold text-site-heading mb-4 pb-2 border-b-2 border-site-line">
								{year}
							</h2>
							<ul className="space-y-4 list-none">
								{postsByYear[year].map(({ date, slug, title }) => (
									<li key={slug} className="group">
										<div className="flex items-baseline gap-4 hover:bg-site-surface-muted p-3 rounded-lg transition-all duration-200 cursor-pointer">
											<span className="text-sm text-site-muted whitespace-nowrap">
												<Date
													dateString={date}
													format={lang === 'zh' ? 'M月D日' : 'MMM D'}
													locale={lang}
												/>
											</span>
											<Link
												href={getLocalePath(lang, `/${date.split('-')[0]}/${date.split('-')[1]}/${slug}`)}
											>
												<span className="text-site-copy group-hover:text-blue-600 dark:group-hover:text-blue-400">
													{title}
												</span>
											</Link>
										</div>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				{/* Right side year navigation */}
				<nav className="hidden lg:block fixed top-24 right-8 xl:right-16 2xl:right-24">
					<div className="bg-site-header backdrop-blur-sm rounded-xl p-3 shadow-sm border border-site-line">
						{years.map((year) => (
							<a
								key={year}
								href={`#${year}`}
								className="group flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-site-surface-muted transition-all duration-200"
							>
								<span className="text-base text-site-copy font-medium">
									{year}
								</span>
								<span className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-medium rounded-full h-5 min-w-[20px] px-1.5">
									{postsByYear[year].length}
								</span>
							</a>
						))}
					</div>
				</nav>
			</section>
		</Layout>
	)
}
