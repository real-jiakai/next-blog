'use client'

import { useEffect, useState } from 'react'
import type { ArticleHeading } from '@/lib/renderPost'
import { trackActiveHeading } from './interaction'

interface ArticleTocProps {
	headings: ArticleHeading[]
	showtoc: boolean
	tocLabel: string
}

/**
 * The issue's sections as a plain list on a hairline rail. The reader's
 * section is marked by a 2px accent bar laid over the rail and ink text; the
 * others stay muted. h3s are indented under their h2.
 */
export default function ArticleToc({ headings, showtoc, tocLabel }: ArticleTocProps) {
	const [activeId, setActiveId] = useState('')

	useEffect(() => {
		if (!showtoc || headings.length === 0) {
			return
		}
		return trackActiveHeading(window, headings, setActiveId)
	}, [headings, showtoc])

	if (!showtoc || headings.length === 0) {
		return null
	}

	return (
		<nav
			aria-label={tocLabel}
			className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain"
		>
			<p className="m-0 text-[0.75rem] font-semibold tracking-[0.3em] text-site-muted">
				{tocLabel}
			</p>
			<ul className="m-0 mt-3 list-none border-l border-site-line p-0 text-sm">
				{headings.map((heading) => {
					const active = activeId === heading.id
					return (
						<li key={heading.id}>
							{/* -ml-px lays the bar over the rail. The focus ring is
							    drawn inside the link: the scrolling nav would clip
							    one drawn outside it on the left. */}
							<a
								href={`#${heading.id}`}
								aria-current={active ? 'location' : undefined}
								className={`-ml-px block border-l-2 py-1.5 transition-colors focus-visible:-outline-offset-2 ${
									heading.depth >= 3 ? 'pl-6' : 'pl-3'
								} ${
									active
										? 'border-site-accent text-site-heading'
										: 'border-transparent text-site-muted hover:text-site-heading'
								}`}
							>
								{heading.value}
							</a>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
