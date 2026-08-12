import { describe, expect, it } from 'vitest'

import { MARK_END, MARK_START, splitHighlights } from './index'

const mark = (text: string) => `${MARK_START}${text}${MARK_END}`

describe('splitHighlights', () => {
	it('returns a single plain run when nothing matched', () => {
		// A hit that matched only on its title comes back with an unmarked crop.
		expect(splitHighlights('nothing marked here')).toEqual([
			{ text: 'nothing marked here', match: false },
		])
	})

	it('separates a match from the text around it', () => {
		expect(splitHighlights(`open ${mark('source')} project`)).toEqual([
			{ text: 'open ', match: false },
			{ text: 'source', match: true },
			{ text: ' project', match: false },
		])
	})

	it('handles a match at the very start and end', () => {
		expect(splitHighlights(`${mark('a')}b${mark('c')}`)).toEqual([
			{ text: 'a', match: true },
			{ text: 'b', match: false },
			{ text: 'c', match: true },
		])
	})

	it('merges adjacent matches, which Chinese segmentation produces', () => {
		// Meilisearch marks each matched token, and 互联网 segments into 互联 + 网,
		// so the two arrive as separate adjacent marks.
		expect(splitHighlights(`自由开放的${mark('互联')}${mark('网')}付出`)).toEqual([
			{ text: '自由开放的', match: false },
			{ text: '互联网', match: true },
			{ text: '付出', match: false },
		])
	})

	it('keeps separate matches separate when text lies between them', () => {
		expect(splitHighlights(`${mark('互联')}的${mark('网')}`)).toEqual([
			{ text: '互联', match: true },
			{ text: '的', match: false },
			{ text: '网', match: true },
		])
	})

	it('treats an unterminated marker as plain text rather than dropping it', () => {
		expect(splitHighlights(`tail ${MARK_START}unclosed`)).toEqual([
			{ text: `tail ${MARK_START}unclosed`, match: false },
		])
	})

	it('produces no empty runs', () => {
		const runs = splitHighlights(`${mark('a')}${mark('b')}c`)
		expect(runs.every((run) => run.text.length > 0)).toBe(true)
	})
})
