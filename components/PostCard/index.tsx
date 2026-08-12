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

/**
 * A floor for the post list: the height a full page of cards occupies at their
 * natural size. On a screen too short for the list to have any leftover height,
 * `flex-1` alone would let a short page's list shrink and the pagination ride
 * up; this keeps it level with every other page. `0.75rem` is the list's gap.
 */
export function listMinHeight(count: number) {
	return {
		minHeight: `calc(${count} * var(--post-card-height) + ${count - 1} * 0.75rem)`,
	}
}

export default function PostCard({ lang, post }: PostCardProps) {
	const { title, date, slug, summary } = post
	const [year, month] = date.split('-')
	const href = getLocalePath(lang, `/${year}/${month}/${slug}`)
	const { text: displayTitle, issue } = splitIssueNumber(title)

	return (
		// The card sizes to its content. A full list opts its cards into sharing
		// out the viewport's leftover height (see the list's `[&>article]` rule),
		// capped by --post-card-max; a short list leaves them alone rather than
		// stretching three posts into empty slabs.
		<article className="group relative flex min-h-(--post-card-height) max-h-(--post-card-max) flex-col justify-center overflow-hidden rounded-xl border border-site-line bg-site-surface px-4 py-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors duration-200 active:bg-site-surface-muted focus-within:ring-2 focus-within:ring-blue-500/50 md:justify-between md:rounded-lg md:px-0 md:py-0 md:shadow-none md:hover:bg-site-surface-muted">
			<span
				aria-hidden
				className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-blue-500/70 transition-colors group-hover:bg-blue-600 md:hidden"
			/>
			{/* Not `flex-1`: letting this stretch would swallow the card's spare
			    height and pin the text to the top, defeating the centring above. */}
			<div className="min-w-0 pl-1 md:px-5 md:pb-2.5 md:pt-3">
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
				<h2 className="mt-2 mb-0 text-xl font-semibold leading-7 text-site-heading transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 md:mt-0 md:text-2xl md:leading-9 md:text-blue-600 md:dark:text-blue-400">
					<Link
						href={href}
						aria-label={title}
						className="after:absolute after:inset-0 focus-visible:outline-none"
					>
						{displayTitle}
					</Link>
				</h2>
				{/* Shown on phones too: hiding it left five short cards unable to
				    fill the screen, and a summary is more use than the blank space
				    it was saving. */}
				<p className="mt-1.5 mb-0 line-clamp-2 text-base leading-7 text-site-muted md:mt-2 md:text-lg md:leading-8">
					{summary}
				</p>
			</div>
			<div className="hidden min-h-9 items-center gap-3 border-t border-site-line px-5 py-2 font-mono text-sm tracking-wide text-site-muted md:flex">
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
