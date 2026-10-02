import Link from 'next/link'
import Date from '@/components/Date'
import { MusicNoteIcon } from '@/components/Icons'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { fillTemplate, groupByYear } from '@/lib/issues'
import type { IssueEntry } from '@/lib/issues'

interface IssueIndexProps {
	lang: Locale
	dict: { common: CommonDictionary }
	// Every issue but the lead, newest first.
	issues: IssueEntry[]
	// The lead issue's year. The lead already carries that year as its id, so
	// the year's section here must not repeat it.
	leadYear?: number
}

const shortDate: Record<Locale, string> = { zh: 'M月D日', en: 'MMM D' }

/**
 * The back issues, grouped by year under an ink rule, one ruled row per issue:
 * the number, the title (the whole row is its link), the excerpt from sm up,
 * and the date and song. Each year section keeps the year as its id, which
 * the old archive's links (`/archive#2024`) still land on.
 */
export default function IssueIndex({ lang, dict, issues, leadYear }: IssueIndexProps) {
	const count = fillTemplate(
		issues.length === 1 ? dict.common.IssueCountOne : dict.common.IssueCount,
		{ count: issues.length },
	)

	return (
		<section id="issues" aria-labelledby="issues-title" className="mt-12 scroll-mt-18">
			<div className="flex items-center gap-4">
				<h2
					id="issues-title"
					className="m-0 text-[0.8125rem] font-semibold tracking-[0.3em] text-site-heading"
				>
					{dict.common.BackIssues}
				</h2>
				<span aria-hidden className="h-px flex-1 bg-site-line" />
				<span className="text-[0.8125rem] text-site-muted tabular-nums">{count}</span>
			</div>
			{groupByYear(issues).map(({ year, entries }) => (
				<section
					key={year}
					id={year === leadYear ? undefined : String(year)}
					aria-labelledby={`y-${year}`}
					className="mt-4 scroll-mt-18 border-t border-site-rule md:grid md:grid-cols-[5.5rem_minmax(0,1fr)]"
				>
					{/* Sticky below the h-14 header with a 1rem gap; keep the two in step. */}
					<h3
						id={`y-${year}`}
						className="m-0 pt-4 font-display text-[1.25rem] font-semibold text-site-heading lining-nums tabular-nums md:sticky md:top-[4.5rem] md:self-start md:text-[1.375rem]"
					>
						{year}
					</h3>
					<ol role="list" className="m-0 list-none p-0">
						{entries.map((issue) => (
							<li
								key={issue.slug}
								className="group relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3.5 py-3.5 has-focus-visible:outline-2 has-focus-visible:outline-site-accent md:grid-cols-[3.75rem_minmax(0,1fr)_8rem] md:gap-x-5 md:py-[1.1rem] [&+li]:border-t [&+li]:border-site-line"
							>
								<span
									aria-hidden
									className="text-right font-display text-[1.75rem] font-semibold leading-none text-site-muted lining-nums tabular-nums transition-colors group-focus-within:text-site-accent group-hover:text-site-accent md:text-[2.25rem]"
								>
									{issue.issue}
								</span>
								<div className="min-w-0">
									{/* The stretched ::after makes the whole row the link; the
									    row, not the link, draws the focus ring around it. */}
									<Link
										href={issue.href}
										className="text-[1.0625rem] font-medium leading-[1.45] text-site-heading text-pretty transition-colors after:absolute after:inset-0 focus-visible:outline-none group-hover:text-site-accent md:text-[1.125rem]"
									>
										{issue.issue !== null && (
											<span className="sr-only">
												{fillTemplate(dict.common.IssueLabel, { n: issue.issue })}
											</span>
										)}
										{issue.displayTitle}
									</Link>
									<p className="m-0 mt-1 hidden truncate text-[0.9375rem] text-site-muted sm:block">
										{issue.excerpt}
									</p>
									<p className="m-0 mt-1 flex items-center gap-1 text-[0.8125rem] text-site-muted tabular-nums md:hidden">
										<Date dateString={issue.date} format={shortDate[lang]} locale={lang} />
										{issue.song && (
											<>
												<span aria-hidden className="mx-0.5">·</span>
												<MusicNoteIcon size={14} />
												<span className="sr-only">{dict.common.IssueBGM}</span>
												<span className="truncate">{issue.song.name}</span>
											</>
										)}
									</p>
								</div>
								<div className="hidden min-w-0 text-right text-[0.8125rem] text-site-muted tabular-nums md:block">
									<Date dateString={issue.date} format={shortDate[lang]} locale={lang} />
									{issue.song && (
										<p className="m-0 mt-0.5 flex items-center justify-end gap-1 text-[0.75rem]">
											<MusicNoteIcon size={14} />
											<span className="sr-only">{dict.common.IssueBGM}</span>
											<span className="truncate">{issue.song.name}</span>
										</p>
									)}
								</div>
							</li>
						))}
					</ol>
				</section>
			))}
		</section>
	)
}
