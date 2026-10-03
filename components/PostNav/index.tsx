import Link from 'next/link'
import type { CommonDictionary } from '@/lib/dictionaries'
import { fillTemplate } from '@/lib/issues'
import type { IssueEntry } from '@/lib/issues'

interface PostNavProps {
	dict: { common: CommonDictionary }
	// The older and the newer neighbour in the contents' order, if any.
	prev: IssueEntry | null
	next: IssueEntry | null
}

/**
 * The previous and next issue, each under its own hairline, which also closes
 * the issue's body: a muted label with the issue's number, then its title
 * without the number (the label already says it). The newer issue keeps to
 * the right-hand column even when there is no older one beside it.
 */
export default function PostNav({ dict, prev, next }: PostNavProps) {
	if (!prev && !next) return null

	const issueSuffix = (entry: IssueEntry) =>
		entry.issue === null ? '' : ` · ${fillTemplate(dict.common.IssueN, { n: entry.issue })}`

	return (
		<nav aria-label={dict.common.PostNavigation} className="mt-16 grid gap-6 sm:grid-cols-2">
			{prev && (
				<Link href={prev.href} className="group min-w-0 border-t border-site-line pt-4">
					<span className="block text-[0.8125rem] tracking-[0.12em] text-site-muted">
						<span aria-hidden>← </span>
						{dict.common.PreviousPost}
						{issueSuffix(prev)}
					</span>
					<span className="mt-1 block text-[1.0625rem] font-medium text-site-heading text-pretty transition-colors group-hover:text-site-accent">
						{prev.displayTitle}
					</span>
				</Link>
			)}
			{next && (
				<Link
					href={next.href}
					className="group min-w-0 border-t border-site-line pt-4 sm:col-start-2 sm:text-right"
				>
					<span className="block text-[0.8125rem] tracking-[0.12em] text-site-muted">
						{dict.common.NextPost}
						{issueSuffix(next)}
						<span aria-hidden> →</span>
					</span>
					<span className="mt-1 block text-[1.0625rem] font-medium text-site-heading text-pretty transition-colors group-hover:text-site-accent">
						{next.displayTitle}
					</span>
				</Link>
			)}
		</nav>
	)
}
