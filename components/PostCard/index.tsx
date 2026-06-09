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
    tags?: string[]
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
	const { title, date, slug, summary, tags } = post
	const [year, month] = date.split('-')
	const href = getLocalePath(lang, `/${year}/${month}/${slug}`)
	const { text: displayTitle, issue } = splitIssueNumber(title)

	return (
		<article className="group relative flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm sm:px-6 sm:py-5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800/60">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tracking-wide text-gray-400 dark:text-gray-500">
					<Date dateString={date} />
					{tags?.map((tag) => (
						<Link
							key={tag}
							href={getLocalePath(lang, `/tag/${tag}`)}
							className="relative z-10 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
						>
							#{tag}
						</Link>
					))}
				</div>
				<h2 className="mt-1.5 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-xl dark:text-gray-100 dark:group-hover:text-blue-400">
					<Link href={href} aria-label={title} className="after:absolute after:inset-0">
						{displayTitle}
					</Link>
				</h2>
				<p className="mt-1.5 mb-0 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
					{summary}
				</p>
			</div>
			{issue && (
				<span
					aria-hidden
					className="pointer-events-none shrink-0 select-none font-mono text-4xl font-bold leading-none tracking-tighter text-gray-200 transition-colors group-hover:text-blue-200 sm:text-6xl dark:text-gray-800 dark:group-hover:text-blue-900/70"
				>
					#{issue}
				</span>
			)}
		</article>
	)
}
