import Link from 'next/link'
import { Locale, getLocalePath } from '@/lib/i18n-config'

interface PaginationProps {
	lang: Locale
	currentPage: number
	totalPages: number
	previousLabel: string
	nextLabel: string
}

type PaginationItem = number | `ellipsis-${number}`

function getPageHref(lang: Locale, page: number): string {
	return page === 1
		? getLocalePath(lang)
		: getLocalePath(lang, `/page/${page}`)
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1)
	}

	const visiblePages = Array.from(new Set([
		1,
		totalPages,
		currentPage - 1,
		currentPage,
		currentPage + 1,
	])).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)

	const items: PaginationItem[] = []
	visiblePages.forEach((page, index) => {
		const previousPage = visiblePages[index - 1]
		if (previousPage && page - previousPage > 1) {
			items.push(`ellipsis-${previousPage}`)
		}
		items.push(page)
	})

	return items
}

export default function Pagination({
	lang,
	currentPage,
	totalPages,
	previousLabel,
	nextLabel,
}: PaginationProps) {
	const hasPreviousPage = currentPage > 1
	const hasNextPage = currentPage < totalPages
	const paginationItems = getPaginationItems(currentPage, totalPages)

	return (
		// The gap above and below has to read as the same space. Only the top is
		// padded here because the pagination is the last thing on the page and
		// the layout's own bottom padding supplies the matching space below;
		// padding both sides would make the lower gap twice the upper one.
		<nav
			aria-label={lang === 'zh' ? '分页' : 'Pagination'}
			className="mx-auto w-full pt-4"
		>
			<div className="mx-auto grid w-full max-w-sm grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm md:hidden">
				{hasPreviousPage && (
					<Link
						rel="prev"
						href={getPageHref(lang, currentPage - 1)}
						className="col-start-1 row-start-1 inline-flex min-h-11 w-full max-w-32 items-center justify-center justify-self-end gap-1.5 whitespace-nowrap rounded-full border border-site-line bg-site-surface px-2 text-xs font-medium text-site-heading shadow-sm transition-colors hover:bg-site-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:max-w-36 sm:px-4 sm:text-sm"
					>
						<span aria-hidden>←</span>
						{previousLabel}
					</Link>
				)}
				<span
					aria-current="page"
					className="col-start-2 row-start-1 inline-flex min-h-11 items-center justify-self-center whitespace-nowrap px-2 font-mono text-xs tracking-wide text-site-muted"
				>
					{currentPage} / {totalPages}
				</span>
				{hasNextPage && (
					<Link
						rel="next"
						href={getPageHref(lang, currentPage + 1)}
						className="col-start-3 row-start-1 inline-flex min-h-11 w-full max-w-32 items-center justify-center justify-self-start gap-1.5 whitespace-nowrap rounded-full border border-site-line bg-site-surface px-2 text-xs font-medium text-site-heading shadow-sm transition-colors hover:bg-site-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:max-w-36 sm:px-4 sm:text-sm"
					>
						{nextLabel}
						<span aria-hidden>→</span>
					</Link>
				)}
			</div>

			<div className="hidden items-center justify-center gap-1 md:flex">
				{hasPreviousPage && (
					<Link
						rel="prev"
						href={getPageHref(lang, currentPage - 1)}
						aria-label={previousLabel}
						className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
					>
						<span aria-hidden>←</span>
					</Link>
				)}

				{paginationItems.map((item) => (
					typeof item === 'number' ? (
						item === currentPage ? (
							<span
								key={item}
								aria-current="page"
								className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-site-surface-muted px-2 font-mono text-sm font-semibold text-blue-600 md:dark:text-blue-400"
							>
								{item}
							</span>
						) : (
							<Link
								key={item}
								href={getPageHref(lang, item)}
								aria-label={lang === 'zh' ? `第 ${item} 页` : `Page ${item}`}
								className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 font-mono text-sm text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
							>
								{item}
							</Link>
						)
					) : (
						<span key={item} aria-hidden className="px-1 text-site-muted">
							…
						</span>
					)
				))}

				{hasNextPage && (
					<Link
						rel="next"
						href={getPageHref(lang, currentPage + 1)}
						aria-label={nextLabel}
						className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 text-site-muted transition-colors hover:bg-site-surface-muted hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
					>
						<span aria-hidden>→</span>
					</Link>
				)}
			</div>
		</nav>
	)
}
