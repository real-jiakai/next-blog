import { isSearchShortcut } from '@/lib/search'

// The header's behaviour, kept apart from its markup so the suites can drive
// it without a browser: each function is handed the window it works on.

/**
 * Opens search on Cmd+K (Apple devices) or Ctrl+K (everything else) and keeps
 * the key from reaching the browser, whose own Cmd/Ctrl+K would otherwise
 * focus its address bar as well. Returns the function that unbinds it.
 */
export function bindSearchShortcut(
	win: Pick<Window, 'addEventListener' | 'removeEventListener'>,
	apple: boolean,
	open: () => void,
): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		if (!isSearchShortcut(event, apple)) return
		event.preventDefault()
		open()
	}

	win.addEventListener('keydown', onKeyDown)
	return () => win.removeEventListener('keydown', onKeyDown)
}

/**
 * Runs `callback` once the page is idle, or after a second where the browser
 * cannot tell (Safari has no requestIdleCallback). Returns a cancel function.
 */
export function whenIdle(
	win: Pick<Window, 'setTimeout' | 'clearTimeout'> &
		Partial<Pick<Window, 'requestIdleCallback' | 'cancelIdleCallback'>>,
	callback: () => void,
): () => void {
	if (typeof win.requestIdleCallback === 'function') {
		const handle = win.requestIdleCallback(callback, { timeout: 2000 })
		return () => win.cancelIdleCallback?.(handle)
	}

	const timer = win.setTimeout(callback, 1000)
	return () => win.clearTimeout(timer)
}

/**
 * The theme to store when the toggle is pressed. The toggle has two states
 * but the theme has three, and picking either one explicitly used to pin the
 * site for good: a reader who ever pressed it stopped following their system,
 * including when it switches at sunset. Landing back on the system's own
 * appearance therefore stores `system` rather than the matching literal, so
 * following resumes.
 */
export function toggledTheme(
	resolvedTheme: string | undefined,
	systemTheme: string | undefined,
): 'light' | 'dark' | 'system' {
	const next = resolvedTheme === 'dark' ? 'light' : 'dark'
	return next === systemTheme ? 'system' : next
}
