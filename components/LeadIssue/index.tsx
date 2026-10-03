import type { CSSProperties } from 'react'
import Link from 'next/link'
import Date from '@/components/Date'
import IssueCover from '@/components/IssueCover'
import { MusicNoteIcon } from '@/components/Icons'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { fillTemplate } from '@/lib/issues'
import type { IssueEntry } from '@/lib/issues'

interface LeadIssueProps {
	lang: Locale
	dict: { common: CommonDictionary }
	issue: IssueEntry
}

/**
 * The newest issue at the head of the contents: its number set large in the
 * accent, the title, the issue's one-line summary in full, its song and, from
 * sm up, its cover in a column of its own at lg. On a phone the number shares
 * a row with the kicker and everything else runs the full width beneath them;
 * from sm up the text is one column beside the number. The text wrapper is
 * `display: contents` on phones so its children can be placed on the grid.
 */
export default function LeadIssue({ lang, dict, issue }: LeadIssueProps) {
	const { cover, song } = issue
	const number = issue.issue
	const hasNumber = number !== null
	const style = cover
		? ({
			'--cover-w': cover.wide ? '18rem' : '14rem',
			'--r-sm': cover.ratioNarrow,
			'--r-lg': cover.ratioWide,
		} as CSSProperties)
		: undefined
	// Without a number there is no numeral column for the text to sit beside.
	const columns = hasNumber
		? `grid-cols-[auto_minmax(0,1fr)] ${cover ? 'lg:grid-cols-[auto_minmax(0,1fr)_var(--cover-w)]' : ''}`
		: `grid-cols-[minmax(0,1fr)] ${cover ? 'lg:grid-cols-[minmax(0,1fr)_var(--cover-w)]' : ''}`

	return (
		<article
			id={String(issue.year)}
			aria-labelledby="lead-title"
			className={`grid scroll-mt-18 gap-x-5 border-b border-site-rule pb-10 pt-8 lg:gap-x-8 lg:pt-10 ${columns}`}
			style={style}
		>
			{hasNumber && (
				<p
					aria-hidden
					className="col-start-1 row-start-1 m-0 font-display text-[5.25rem] font-semibold leading-[0.8] tracking-[-0.03em] text-site-accent lining-nums tabular-nums lg:text-[8rem]"
				>
					{number}
				</p>
			)}
			<div
				className={
					hasNumber
						? 'contents sm:col-start-2 sm:row-start-1 sm:block sm:min-w-0 sm:max-w-2xl sm:self-end lg:self-start'
						: 'min-w-0 max-w-2xl'
				}
			>
				<p
					className={`m-0 text-[0.8125rem] tracking-[0.14em] ${
						hasNumber ? 'col-start-2 row-start-1 self-end' : ''
					}`}
				>
					<span className="font-semibold text-site-accent">{dict.common.LatestIssue}</span>
					<span className="text-site-muted">
						{' · '}
						<Date dateString={issue.date} locale={lang} />
					</span>
				</p>
				<h2
					id="lead-title"
					className={`col-span-2 m-0 mt-4 text-[1.625rem] font-bold leading-[1.25] text-site-heading text-balance sm:mt-2 ${
						lang === 'en' ? 'lg:text-[1.875rem]' : 'lg:text-[2.125rem]'
					}`}
				>
					<Link href={issue.href} className="transition-colors hover:text-site-accent">
						{hasNumber && (
							<span className="sr-only">{fillTemplate(dict.common.IssueLabel, { n: number })}</span>
						)}
						{issue.displayTitle}
					</Link>
				</h2>
				<p className="col-span-2 m-0 mt-4 text-base leading-7 text-site-copy text-pretty lg:text-[1.0625rem] lg:leading-[1.85]">
					{issue.excerpt}
				</p>
				{song && (
					<p className="col-span-2 m-0 mt-4 flex items-center gap-1.5 text-sm text-site-muted">
						<MusicNoteIcon size={16} />
						<span className="sr-only">{dict.common.IssueBGM}</span>
						{song.name} — {song.artist}
					</p>
				)}
				{hasNumber && (
					// A grid item on phones, where it would otherwise stretch and
					// draw its underline across the whole row.
					<Link
						href={issue.href}
						className="col-span-2 mt-5 inline-block justify-self-start border-b-[1.5px] border-current pb-0.5 text-[0.9375rem] font-semibold text-site-accent transition-colors hover:border-transparent"
					>
						{fillTemplate(dict.common.ReadIssue, { n: number })}
					</Link>
				)}
			</div>
			{cover && (
				<IssueCover
					cover={cover}
					coverLabel={dict.common.Cover}
					className={`mt-6 -mx-4 sm:mx-0 sm:max-w-[20rem] lg:row-start-1 lg:mt-0 lg:max-w-none ${
						hasNumber ? 'col-span-2 sm:col-span-1 sm:col-start-2 lg:col-start-3' : 'lg:col-start-2'
					}`}
				/>
			)}
		</article>
	)
}
