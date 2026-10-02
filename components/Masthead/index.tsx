import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { formatMonthYear } from '@/lib/formatDate'
import { fillTemplate, formatIssueRange } from '@/lib/issues'
import type { IssueStats } from '@/lib/issues'

interface MastheadProps {
	lang: Locale
	dict: { common: CommonDictionary }
	stats: IssueStats
	tagline: string
}

const linkClass =
	'underline decoration-site-line underline-offset-4 transition-colors hover:text-site-heading hover:decoration-site-accent'

/**
 * The contents page's head: its heading, the site's tagline, a double rule,
 * and a folio line with the run of issues, when it began and how often it
 * appears. Every figure comes from the posts at build time.
 */
export default function Masthead({ lang, dict, stats, tagline }: MastheadProps) {
	const range = formatIssueRange(dict.common, stats)
	const founded = stats.firstDate
		? fillTemplate(dict.common.FoundedIn, { date: formatMonthYear(stats.firstDate, lang) })
		: null
	const run = [range, founded].filter(Boolean).join(' · ')

	return (
		<header className="pt-10 md:pt-14">
			<div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1">
				<h1 className="m-0 text-[2rem] font-bold tracking-tight text-site-heading md:text-[2.5rem]">
					{dict.common.Contents}
				</h1>
				<p className="m-0 max-w-[26rem] text-[0.9375rem] text-site-muted text-pretty md:text-right">
					{tagline}
				</p>
			</div>
			<div className="mt-3 border-t-[3px] border-double border-site-rule" />
			{stats.count > 0 && (
				<p className="m-0 flex flex-wrap justify-between gap-x-6 gap-y-0.5 border-b border-site-line py-2 text-[0.75rem] tracking-[0.12em] text-site-muted tabular-nums md:text-[0.8125rem]">
					<span>{run}</span>
					<span>
						{dict.common.Cadence} ·{' '}
						<a
							href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
							type="application/atom+xml"
							className={linkClass}
						>
							{dict.common.RssSubscribe}
						</a>
					</span>
				</p>
			)}
		</header>
	)
}
