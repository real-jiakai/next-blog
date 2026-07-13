import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'
import Date from '@/components/Date'

interface PostCardProps {
  lang: Locale
  post: {
    title: string
    date: string
    slug: string
    summary: string
  }
}

// Titles follow the "Topic #N" weekly-issue convention; pull the issue
// number out so it can be rendered as the card's folio numeral instead.
function splitIssueNumber(title: string): { text: string; issue: string | null } {
	const match = title.match(/^(.*?)\s*#(\d+)\s*$/)
	if (match) {
		return { text: match[1], issue: match[2] }
	}
	return { text: title, issue: null }
}

export default function PostCard({ lang, post }: PostCardProps) {
	const { title, date, slug, summary } = post
	const [year, month] = date.split('-')
	const href = getLocalePath(lang, `/${year}/${month}/${slug}`)
	const { text: displayTitle, issue } = splitIssueNumber(title)

	return (
		<article className="group relative min-h-24 overflow-hidden rounded-xl border border-site-line bg-site-surface px-4 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors duration-200 active:bg-site-surface-muted focus-within:ring-2 focus-within:ring-blue-500/50 md:block md:min-h-0 md:rounded-lg md:px-0 md:py-0 md:shadow-none md:hover:bg-site-surface-muted">
			<span
				aria-hidden
				className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-blue-500/70 transition-colors group-hover:bg-blue-600 md:hidden"
			/>
			<div className="min-w-0 flex-1 pl-1 md:px-5 md:pb-2.5 md:pt-3">
				<div className="flex items-center justify-between gap-3 md:hidden">
					<div className="font-mono text-[0.8rem] tracking-wide text-site-muted md:text-xs">
						<Date dateString={date} locale={lang} />
					</div>
					{issue && (
						<span
							aria-hidden
							className="rounded-md bg-site-surface-muted px-2 py-0.5 font-mono text-[0.75rem] font-medium tracking-wider text-blue-600 dark:text-blue-400 md:hidden"
						>
							No. {issue}
						</span>
					)}
				</div>
				{/* 1.35rem = 21.6px, matching the Hugo blog's body size */}
				<h2 className="mt-2 mb-0 text-lg font-semibold leading-7 text-site-heading transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 md:mt-0 md:text-[1.35rem] md:leading-8 md:text-blue-600 md:dark:text-blue-400">
					<Link
						href={href}
						aria-label={title}
						className="after:absolute after:inset-0 focus-visible:outline-none"
					>
						{displayTitle}
					</Link>
				</h2>
				<p className="mt-1.5 mb-0 hidden text-base leading-7 text-site-muted md:line-clamp-2">
					{summary}
				</p>
			</div>
			<div className="hidden min-h-8 items-center gap-3 border-t border-site-line px-5 py-1.5 font-mono text-[0.8125rem] tracking-wide text-site-muted md:flex">
				<Date dateString={date} locale={lang} />
				{issue && (
					<>
						<span aria-hidden className="h-3 w-px bg-site-line" />
						<span aria-hidden className="font-medium text-blue-600 md:dark:text-blue-400">
							No. {issue}
						</span>
					</>
				)}
			</div>
		</article>
	)
}
