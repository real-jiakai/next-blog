import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { formatMonthYear } from '@/lib/formatDate'
import { fillTemplate } from '@/lib/issues'
import type { IssueStats } from '@/lib/issues'

interface MastheadProps {
	lang: Locale
	dict: { common: CommonDictionary }
	stats: IssueStats
}

/**
 * The contents page's head: its heading, a standfirst saying what the
 * periodical is, a double rule, and a folio line with when it was founded and
 * how often it appears. It repeats nothing the page already shows: the brand
 * is in the header, the feed and About are in the header too, and the run of
 * issues is the lead's numeral and the list below. The founding date comes
 * from the posts at build time.
 */
export default function Masthead({ lang, dict, stats }: MastheadProps) {
	const founded = stats.firstDate
		? fillTemplate(dict.common.FoundedIn, { date: formatMonthYear(stats.firstDate, lang) })
		: null
	const folio = [founded, dict.common.Cadence].filter(Boolean).join(' · ')

	return (
		// Even padding above and below: the space under the folio is the
		// masthead's, not the lead's, so the two gaps around it match.
		<header className="py-8 lg:py-10">
			<div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
				<h1 className="m-0 text-[2rem] font-bold tracking-tight text-site-heading md:text-[2.5rem]">
					{dict.common.Contents}
				</h1>
				<p className="m-0 max-w-[32rem] text-[0.9375rem] text-site-muted text-balance md:ml-auto md:text-right">
					{dict.common.Standfirst}
				</p>
			</div>
			<div className="mt-3 border-t-[3px] border-double border-site-rule" />
			{stats.count > 0 && (
				<p className="m-0 border-b border-site-line py-2 text-[0.75rem] tracking-[0.12em] text-site-muted text-balance tabular-nums md:text-[0.8125rem]">
					{folio}
				</p>
			)}
		</header>
	)
}
