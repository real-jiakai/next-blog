import { describe, expect, it, vi } from 'vitest'
import {
	activeHeadingId,
	readPosition,
	trackActiveHeading,
} from '@/components/ArticleToc/interaction'
import type { HeadingBox, ReadingPosition } from '@/components/ArticleToc/interaction'

const headings = [{ id: 'cover' }, { id: 'topic' }, { id: 'links' }]

// A page 3000px tall in an 800px window, scrolled to `scrollY`, with each
// heading `top` pixels below the viewport's top and a 96px scroll margin
// (scroll-mt-24 at the default font size; h2s carry scroll-mt-20, which the
// spy reads the same way).
function page(
	tops: Record<string, number | null>,
	{ scrollY = 400, hash = '' }: { scrollY?: number, hash?: string } = {},
): ReadingPosition {
	return {
		locate: (id) => {
			const top = tops[id]
			return top == null ? null : { top, scrollMarginTop: 96 }
		},
		scrollY,
		viewportHeight: 800,
		documentHeight: 3000,
		hash,
	}
}

describe('the contents scroll-spy', () => {
	it('marks nothing before the first heading reaches the line', () => {
		expect(activeHeadingId(headings, page({ cover: 300, topic: 900, links: 1600 }))).toBe('')
	})

	it('marks the last heading at or above its scroll margin plus a small buffer', () => {
		expect(activeHeadingId(headings, page({ cover: -400, topic: 112, links: 900 }))).toBe('topic')
		expect(activeHeadingId(headings, page({ cover: -400, topic: 113, links: 900 }))).toBe('cover')
	})

	it('skips a heading that is not in the document rather than stopping there', () => {
		expect(activeHeadingId(headings, page({ cover: -400, topic: null, links: 50 }))).toBe('links')
	})

	it('counts the bottom of the page as reaching the last heading', () => {
		// 2200 + 800 = 3000: scrolled to the end, the last heading still below the line.
		expect(
			activeHeadingId(headings, page({ cover: -1800, topic: 200, links: 500 }, { scrollY: 2200 })),
		).toBe('links')
		// Within 2px of the end still counts.
		expect(
			activeHeadingId(headings, page({ cover: -1800, topic: 200, links: 500 }, { scrollY: 2198 })),
		).toBe('links')
		expect(
			activeHeadingId(headings, page({ cover: -1800, topic: 200, links: 500 }, { scrollY: 2197 })),
		).toBe('cover')
	})

	it('keeps a clicked heading active at the bottom when the jump to it reached the line', () => {
		expect(
			activeHeadingId(
				headings,
				page({ cover: -1800, topic: 96, links: 500 }, { scrollY: 2200, hash: '#topic' }),
			),
		).toBe('topic')
	})

	it('decodes the hash to compare it with the heading ids', () => {
		const zhHeadings = [{ id: '封面图' }, { id: '话题' }, { id: '链享' }]
		const bottom = page(
			{ '封面图': -1800, '话题': 96, '链享': 500 },
			{ scrollY: 2200, hash: `#${encodeURIComponent('话题')}` },
		)

		expect(activeHeadingId(zhHeadings, bottom)).toBe('话题')
	})

	it('reads a malformed hash as naming no heading', () => {
		expect(() =>
			activeHeadingId(headings, page({ cover: -1800, topic: 96, links: 500 }, { scrollY: 2200, hash: '#%E0%A4%A' })),
		).not.toThrow()
		expect(
			activeHeadingId(headings, page({ cover: -1800, topic: 96, links: 500 }, { scrollY: 2200, hash: '#%E0%A4%A' })),
		).toBe('links')
	})

	it('never applies the bottom rule to a page that is not scrolled', () => {
		const short: ReadingPosition = { ...page({ cover: 300, topic: 400, links: 500 }, { scrollY: 0 }), documentHeight: 800 }
		expect(activeHeadingId(headings, short)).toBe('')
	})

	it('has nothing to mark without headings', () => {
		expect(activeHeadingId([], page({}, { scrollY: 2200 }))).toBe('')
	})
})

describe('reading the live page', () => {
	function fakeWindow(boxes: Record<string, HeadingBox>, scrollY = 0) {
		const listeners = new Map<string, () => void>()
		const frames: (() => void)[] = []
		const win = {
			document: {
				getElementById: (id: string) =>
					boxes[id] ? { id, getBoundingClientRect: () => ({ top: boxes[id].top }) } : null,
				documentElement: { scrollHeight: 3000 },
			},
			getComputedStyle: (element: { id: string }) => ({
				scrollMarginTop: `${boxes[element.id].scrollMarginTop}px`,
			}),
			scrollY,
			innerHeight: 800,
			location: { hash: '' },
			addEventListener: vi.fn((type: string, listener: () => void) => listeners.set(type, listener)),
			removeEventListener: vi.fn((type: string) => listeners.delete(type)),
			requestAnimationFrame: vi.fn((callback: () => void) => frames.push(callback)),
			cancelAnimationFrame: vi.fn(),
		}
		return { win, listeners, frames }
	}

	it('measures each heading fresh and resolves its scroll margin', () => {
		const { win } = fakeWindow({ topic: { top: 120, scrollMarginTop: 120 } }, 300)
		const position = readPosition(win as unknown as Window)

		expect(position.locate('topic')).toEqual({ top: 120, scrollMarginTop: 120 })
		expect(position.locate('missing')).toBeNull()
		expect(position).toMatchObject({ scrollY: 300, viewportHeight: 800, documentHeight: 3000, hash: '' })
	})

	it('reports at once, then at most once a frame, and stops listening when asked', () => {
		const { win, listeners, frames } = fakeWindow({
			cover: { top: -10, scrollMarginTop: 96 },
			topic: { top: 400, scrollMarginTop: 96 },
		}, 200)
		const onChange = vi.fn()
		const stop = trackActiveHeading(win as unknown as Window, headings, onChange)

		expect(onChange).toHaveBeenLastCalledWith('cover')
		listeners.get('scroll')!()
		listeners.get('resize')!()
		expect(frames).toHaveLength(1)
		frames[0]()
		expect(onChange).toHaveBeenCalledTimes(2)

		listeners.get('scroll')!()
		stop()
		expect(win.cancelAnimationFrame).toHaveBeenCalledTimes(1)
		expect(listeners.size).toBe(0)
	})
})
