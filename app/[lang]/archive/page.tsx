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
			<section className="max-w-4xl mx-auto px-4 md:px-6 w-full">
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
											{/* Fixed-width and right-aligned so every title starts at the
											    same x, whatever the length of the date beside it. */}
											<span className="w-20 shrink-0 text-right font-mono text-sm tabular-nums text-site-muted whitespace-nowrap">
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

				{/* Right side year navigation: one chip per year, the count carried
				    beside the year as smaller, quieter text so it reads as a detail
				    of the label rather than a competing number. */}
				<nav
					aria-label={lang === 'zh' ? '按年份浏览' : 'Browse by year'}
					className="hidden lg:block fixed top-24 right-8 xl:right-16 2xl:right-24"
				>
					<ul className="flex list-none flex-col items-stretch gap-2">
						{years.map((year) => (
							<li key={year} className="flex">
								<a
									href={`#${year}`}
									className="flex flex-1 items-baseline gap-2 rounded-lg border border-site-line bg-site-surface px-3 py-1.5 transition-colors hover:border-blue-500/50 hover:bg-site-surface-muted"
								>
									<span className="text-base font-medium text-site-heading">{year}</span>
									<span className="text-xs tabular-nums text-site-muted">
										{postsByYear[year].length}
									</span>
								</a>
							</li>
						))}
					</ul>
				</nav>
			</section>
		</Layout>
	)
}
