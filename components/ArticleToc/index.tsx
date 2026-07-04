'use client'

import { useEffect, useMemo, useState } from 'react'
import parseHeading from '@/lib/parseHeading'

interface ArticleTocProps {
  contentMarkdown: string
  showtoc: boolean
  tocLabel: string
}

interface Heading {
  depth: number
  value: string
  id: string
}

// Headings carry scroll-mt-24 (96px) for the sticky header; a heading counts
// as "reached" once its top passes that line, with a small buffer.
const SCROLL_OFFSET = 96 + 16

export default function ArticleToc({ contentMarkdown, showtoc, tocLabel }: ArticleTocProps) {
	const headings: Heading[] = useMemo(
		() => parseHeading(contentMarkdown),
		[contentMarkdown]
	)
	const [activeId, setActiveId] = useState('')

	useEffect(() => {
		if (!showtoc || headings.length === 0) {
			return
		}

		let ticking = false

		// The active heading is the last one at or above the offset line.
		// Headings are looked up fresh each time (not captured once) because
		// React may replace the article DOM after hydration, which would
		// leave captured element references detached.
		const updateActive = () => {
			ticking = false
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
			setActiveId(current)
		}

		const onScroll = () => {
			if (!ticking) {
				ticking = true
				requestAnimationFrame(updateActive)
			}
		}

		window.addEventListener('scroll', onScroll, { passive: true })
		window.addEventListener('resize', onScroll, { passive: true })
		updateActive()

		return () => {
			window.removeEventListener('scroll', onScroll)
			window.removeEventListener('resize', onScroll)
		}
	}, [headings, showtoc])

	if (!showtoc || headings.length === 0) {
		return null
	}

	return (
		<nav>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
				{tocLabel}
			</h3>
			<ul className="space-y-2.5 text-sm list-none">
				{headings.map((heading, index) => (
					<li key={index}>
						<a
							href={`#${heading.id}`}
							aria-current={activeId === heading.id ? 'location' : undefined}
							className={`block transition-colors ${
								heading.depth === 3 ? 'pl-4' : ''
							} ${
								activeId === heading.id
									? 'text-blue-500 dark:text-blue-400 font-medium'
									: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
