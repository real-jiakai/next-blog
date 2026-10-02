'use client'

import { useEffect, useState } from 'react'

interface ArticleTocProps {
  headings: ArticleHeading[]
  showtoc: boolean
  tocLabel: string
  /** Post title, rendered as the root the section tree branches from. */
  title: string
}

export interface ArticleHeading {
  depth: number
  value: string
  id: string
}

// Headings carry scroll-mt-24 for the sticky header. It is rem-based, so it
// grows with the reader's font size; a heading counts as "reached" once its
// top passes its own resolved scroll margin, plus a small buffer.
const REACHED_BUFFER = 16

export default function ArticleToc({ headings, showtoc, tocLabel, title }: ArticleTocProps) {
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
				const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
				if (el.getBoundingClientRect().top <= margin + REACHED_BUFFER) {
					current = heading.id
				} else {
					break
				}
			}
			// A closing heading with little below it never reaches the line, so
			// the bottom of a page that scrolls counts as reaching the last one,
			// unless the reader jumped to the heading that did reach it: clicking
			// a short second-to-last section lands on the same bottom scroll.
			const doc = document.documentElement
			let target = ''
			try {
				target = decodeURIComponent(window.location.hash.slice(1))
			} catch {
				// A malformed escape in the hash names no heading.
			}
			if (
				current !== target &&
				window.scrollY > 0 &&
				window.innerHeight + window.scrollY >= doc.scrollHeight - 2
			) {
				current = headings[headings.length - 1].id
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

	// Drawn as a tree, after the cursor.com blog: the post title is the root,
	// a rail drops from it, and every section hangs off the rail by a short
	// tick. The reader's position is a dot beside the active item rather than
	// a change of colour into the accent.
	return (
		<nav
			aria-label={tocLabel}
			className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain pr-1"
		>
			<p className="my-0 text-[0.9375rem] font-medium leading-6 text-site-heading">
				{title}
			</p>
			<ul className="ml-2 mt-2 list-none text-sm">
				{headings.map((heading) => {
					const active = activeId === heading.id
					const nested = heading.depth >= 3
					return (
						<li
							key={heading.id}
							// Each item draws its own slice of the rail, so the rail
							// ends in an elbow at the last item instead of running on
							// past it. The tick sits at the item's vertical middle,
							// which is also where the last slice stops.
							className={`relative before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-site-line last:before:h-1/2 after:absolute after:left-0 after:top-1/2 after:h-px after:bg-site-line ${
								nested ? 'after:w-5' : 'after:w-2'
							}`}
						>
							<a
								href={`#${heading.id}`}
								aria-current={active ? 'location' : undefined}
								className={`flex items-center py-1.5 transition-colors ${
									nested ? 'pl-7' : 'pl-4'
								} ${
									active
										? 'text-site-heading'
										: 'text-site-muted hover:text-site-heading'
								}`}
							>
								<span className="min-w-0">{heading.value}</span>
								{/* Always in the layout so appearing costs no reflow;
								    only its opacity follows the reading position. */}
								<span
									aria-hidden
									className={`ml-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8552d] transition-opacity duration-200 ${
										active ? 'opacity-100' : 'opacity-0'
									}`}
								/>
							</a>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}
