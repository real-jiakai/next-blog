import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSiteOpenGraph } from '@/lib/metadata'
import { getSortedPostsData } from '@/lib/posts'
import Layout from '@/components/Layout'
import Date from '@/components/Date'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	const dict = await getDictionary(lang)
	return {
		title: dict.common.Archive,
		alternates: {
			canonical: getLocalePath(lang, '/archive'),
			languages: getLanguageAlternates('/archive'),
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: getSiteOpenGraph(lang, '/archive'),
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
				<h1 className="sr-only">{dict.common.Archive}</h1>
				<div>
					{years.map((year) => (
						// scroll-mt clears the sticky header when a year chip jumps
						// here, as the article headings do.
						<section key={year} id={year} className="mb-12 scroll-mt-24">
							<h2 className="text-2xl font-bold text-site-heading mt-6 mb-4 pb-2 border-b-2 border-site-line">
								{year}
							</h2>
							<ul className="space-y-4 list-none">
								{postsByYear[year].map(({ date, slug, title }) => (
									<li key={slug}>
										{/* The whole row is the link. It already looked like one —
										    hover tint and pointer cursor — so the target must match
										    what the styling promises, not just the title text. */}
										<Link
											href={getLocalePath(lang, `/${date.split('-')[0]}/${date.split('-')[1]}/${slug}`)}
											className="group flex items-baseline gap-4 rounded-lg p-3 transition-colors duration-200 hover:bg-site-surface-muted"
										>
											{/* Fixed-width and right-aligned so every title starts at the
											    same x, whatever the length of the date beside it. */}
											<span className="w-20 shrink-0 text-right font-mono text-sm tabular-nums text-site-muted whitespace-nowrap">
												<Date
													dateString={date}
													format={lang === 'zh' ? 'M月D日' : 'MMM D'}
													locale={lang}
												/>
											</span>
											<span className="text-site-copy group-hover:text-blue-600 dark:group-hover:text-blue-400">
												{title}
											</span>
										</Link>
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
					aria-label={dict.common.BrowseByYear}
					className="hidden lg:block fixed top-24 right-8 xl:right-16 2xl:right-24"
				>
					<ul className="flex list-none flex-col items-stretch gap-2">
						{years.map((year) => {
							const count = postsByYear[year].length
							// Read aloud, the bare count after the year means nothing.
							const label = (
								count === 1 ? dict.common.YearPostCountOne : dict.common.YearPostCount
							)
								.replace('{year}', year)
								.replace('{count}', String(count))
							return (
								<li key={year} className="flex">
									<a
										href={`#${year}`}
										aria-label={label}
										className="flex flex-1 items-baseline gap-2 rounded-lg border border-site-line bg-site-surface px-3 py-1.5 transition-colors hover:border-blue-500/50 hover:bg-site-surface-muted"
									>
										<span className="text-base font-medium text-site-heading">{year}</span>
										<span className="text-xs tabular-nums text-site-muted">{count}</span>
									</a>
								</li>
							)
						})}
					</ul>
				</nav>
			</section>
		</Layout>
	)
}
