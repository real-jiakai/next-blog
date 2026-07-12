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
		<article className="group relative flex items-center justify-between gap-4 border-y border-site-line bg-site-surface px-4 py-5 transition-all duration-200 hover:bg-site-surface-muted md:rounded-xl md:border md:px-6 dark:hover:bg-site-surface-muted">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-wide text-site-muted">
					<Date dateString={date} locale={lang} />
					{issue && <span aria-hidden className="md:hidden">#{issue}</span>}
				</div>
				<h2 className="mt-1.5 text-lg font-semibold text-site-heading transition-colors group-hover:text-blue-600 sm:text-xl dark:group-hover:text-blue-400">
					<Link href={href} aria-label={title} className="after:absolute after:inset-0">
						{displayTitle}
					</Link>
				</h2>
				<p className="mt-1.5 mb-0 line-clamp-2 text-sm leading-relaxed text-site-muted">
					{summary}
				</p>
			</div>
			{issue && (
				<span
					aria-hidden
					className="pointer-events-none hidden shrink-0 select-none font-mono text-6xl font-bold leading-none tracking-tighter text-gray-200 transition-colors group-hover:text-blue-200 md:block dark:text-gray-700 dark:group-hover:text-blue-900/70"
				>
					#{issue}
				</span>
			)}
		</article>
	)
}
