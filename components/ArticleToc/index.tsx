'use client'

import { useEffect, useState } from 'react'

interface ArticleTocProps {
  headings: ArticleHeading[]
  showtoc: boolean
  tocLabel: string
}

export interface ArticleHeading {
  depth: number
  value: string
  id: string
}

// Headings carry scroll-mt-24 (96px) for the sticky header; a heading counts
// as "reached" once its top passes that line, with a small buffer.
const SCROLL_OFFSET = 96 + 16

export default function ArticleToc({ headings, showtoc, tocLabel }: ArticleTocProps) {
	const [activeId, setActiveId] = useState('')

	useEffect(() => {
		if (!showtoc || headings.length === 0) {
			return
		}

		let frameId: number | null = null

		// The active heading is the last one at or above the offset line.
		// Headings are looked up fresh each time (not captured once) because
		// React may replace the article DOM after hydration, which would
		// leave captured element references detached.
		const updateActive = () => {
			frameId = null
			let current = ''
			for (const heading of headings) {
				const el = document.getElementById(heading.id)
				if (!el) continue
				if (el.getBoundingClientRect().top <= SCROLL_OFFSET) {
					current = heading.id
				} else {
					break
				}
			}
			setActiveId((previous) => previous === current ? previous : current)
		}

		const onScroll = () => {
			if (frameId === null) {
				frameId = requestAnimationFrame(updateActive)
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll, { passive: true })
		updateActive()

		return () => {
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
			if (frameId !== null) {
				cancelAnimationFrame(frameId)
			}
		}
	}, [headings, showtoc])

	if (!showtoc || headings.length === 0) {
		return null
	}

	return (
		<nav aria-label={tocLabel}>
			<h3 className="text-sm font-semibold text-site-heading mb-4">
				{tocLabel}
			</h3>
			<ul className="space-y-2.5 text-sm list-none">
				{headings.map((heading) => (
					<li key={heading.id}>
						<a
							href={`#${heading.id}`}
							aria-current={activeId === heading.id ? 'location' : undefined}
							className={`block transition-colors ${
								heading.depth === 3 ? 'pl-4' : ''
							} ${
								activeId === heading.id
									? 'text-blue-500 dark:text-blue-400 font-medium'
									: 'text-site-muted hover:text-site-heading'
							}`}
						>
							{heading.value}
						</a>
					</li>
				))}
			</ul>
		</nav>
	)
}
