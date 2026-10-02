// The button's behaviour, kept apart from its markup so the suites can drive
// it without a browser: each function is handed the window it works on.

/** How far down the page, in pixels, the button appears. */
const SHOW_AFTER = 300

/**
 * Reports whether the page is scrolled past the first screen: at once, and
 * again on every scroll. Returns the function that stops listening.
 */
export function trackScrolledDown(
	win: Pick<Window, 'scrollY' | 'addEventListener' | 'removeEventListener'>,
	onChange: (scrolled: boolean) => void,
): () => void {
	const update = () => onChange(win.scrollY > SHOW_AFTER)

	win.addEventListener('scroll', update, { passive: true })
	// A reload or back navigation can restore the scroll position before the
	// listener exists, so check once now rather than wait for the next scroll.
	update()

	return () => win.removeEventListener('scroll', update)
}

/** Scrolls back to the top, gliding unless the reader asked for less motion. */
export function returnToTop(win: Pick<Window, 'document' | 'matchMedia' | 'scrollTo'>): void {
	// The button unmounts once the page is back at the top. Move focus to the
	// site name first, or it falls to <body> and the next Tab resumes from
	// where the button was, at the foot of the page.
	win.document.getElementById('site-brand')?.focus({ preventScroll: true })
	win.scrollTo({
		top: 0,
		behavior: win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
	})
}
