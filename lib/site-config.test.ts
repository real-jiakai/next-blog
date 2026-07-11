import { describe, expect, it } from 'vitest'
import { getPostsPerPage, parsePageNumber } from './site-config'

describe('getPostsPerPage', () => {
	it('uses a stable default when the setting is omitted', () => {
		expect(getPostsPerPage(undefined)).toBe(10)
	})

	it.each(['0', '-1', '1.5', 'ten', ' 10', '101'])(
		'rejects unsafe pagination size %s',
		(value) => {
			expect(() => getPostsPerPage(value)).toThrow()
		},
	)

	it('accepts a bounded positive integer', () => {
		expect(getPostsPerPage('25')).toBe(25)
	})
})

describe('parsePageNumber', () => {
	it.each(['foo', '1abc', '0', '-1', '01', '9007199254740992'])(
		'rejects invalid page path %s',
		(value) => {
			expect(parsePageNumber(value)).toBeNull()
		},
	)

	it('accepts a canonical positive page number', () => {
		expect(parsePageNumber('42')).toBe(42)
	})
})
