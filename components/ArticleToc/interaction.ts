// The contents' scroll-spy, kept apart from its markup so the suites can
// drive it without a browser: it is handed the window, or what it reads of
// one, instead of reaching for the globals.

/** Where a heading sits now: its distance from the viewport top and its own scroll margin. */
export interface HeadingBox {
	top: number
	scrollMarginTop: number
}

/** What the scroll-spy reads of the page at one moment. */
export interface ReadingPosition {
	/** null when no element has the id. */
	locate: (id: string) => HeadingBox | null
	scrollY: number
	viewportHeight: number
	documentHeight: number
	/** `location.hash`, still percent-encoded. */
	hash: string
}

type SpyWindow = Pick<
	Window,
	| 'document'
	| 'getComputedStyle'
	| 'scrollY'
	| 'innerHeight'
	| 'location'
	| 'addEventListener'
	| 'removeEventListener'
	| 'requestAnimationFrame'
	| 'cancelAnimationFrame'
>

// Headings carry scroll-mt-20 (h2) or scroll-mt-24 for the sticky header.
// The margin is rem-based, so it grows with the reader's font size; a heading
// counts as "reached" once its top passes its own resolved scroll margin,
// plus a small buffer.
const REACHED_BUFFER = 16

/**
 * The id of the heading the reader is in: the last one at or above the
 * offset line, or '' before the first. A closing heading with little below it
 * never reaches the line, so the bottom of a page that scrolls counts as
 * reaching the last one, unless the hash names the reached heading or one
 * below it: there, clicking any of the closing sections lands on the same
 * bottom scroll, and only the hash says which one the reader chose.
 */
export function activeHeadingId(headings: readonly { id: string }[], page: ReadingPosition): string {
	let current = ''
	for (const heading of headings) {
		const box = page.locate(heading.id)
		if (!box) continue
		if (box.top <= box.scrollMarginTop + REACHED_BUFFER) {
			current = heading.id
		} else {
			break
		}
	}

	let target = ''
	try {
		target = decodeURIComponent(page.hash.slice(1))
	} catch {
		// A malformed escape in the hash names no heading.
	}
	if (
		headings.length > 0 &&
		current !== target &&
		page.scrollY > 0 &&
		page.viewportHeight + page.scrollY >= page.documentHeight - 2
	) {
		const ids = headings.map((heading) => heading.id)
		current = ids.indexOf(target) > ids.indexOf(current) ? target : ids[ids.length - 1]
	}
	return current
}

/**
 * Reads the page as it is now. Headings are looked up fresh on every read
 * (not captured once) because React may replace the article DOM after
 * hydration, which would leave captured element references detached.
 */
export function readPosition(win: Pick<SpyWindow, 'document' | 'getComputedStyle' | 'scrollY' | 'innerHeight' | 'location'>): ReadingPosition {
	const { document } = win
	return {
		locate: (id) => {
			const element = document.getElementById(id)
			if (!element) return null
			return {
				top: element.getBoundingClientRect().top,
				scrollMarginTop: parseFloat(win.getComputedStyle(element).scrollMarginTop) || 0,
			}
		},
		scrollY: win.scrollY,
		viewportHeight: win.innerHeight,
		documentHeight: document.documentElement.scrollHeight,
		hash: win.location.hash,
	}
}

/**
 * Reports the active heading at once, and again at most once a frame while
 * the page scrolls or resizes, or its hash changes: at the bottom of a page,
 * clicking between the last two entries may not scroll at all, and only the
 * hash says which of them the reader chose. Returns the function that stops
 * listening.
 */
export function trackActiveHeading(
	win: SpyWindow,
	headings: readonly { id: string }[],
	onChange: (id: string) => void,
): () => void {
	let frameId: number | null = null

	const update = () => {
		frameId = null
		onChange(activeHeadingId(headings, readPosition(win)))
	}
	const schedule = () => {
		if (frameId === null) {
			frameId = win.requestAnimationFrame(update)
		}
	}

	win.addEventListener('scroll', schedule, { passive: true })
	win.addEventListener('resize', schedule, { passive: true })
	win.addEventListener('hashchange', schedule)
	update()

	return () => {
		win.removeEventListener('scroll', schedule)
		win.removeEventListener('resize', schedule)
		win.removeEventListener('hashchange', schedule)
		if (frameId !== null) {
			win.cancelAnimationFrame(frameId)
		}
	}
}
