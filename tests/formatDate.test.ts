import { describe, expect, it } from 'vitest'
import { formatDate } from '../lib/formatDate'

describe('formatDate', () => {
	it('formats English dates with an English month name', () => {
		expect(formatDate('2025-01-27', 'en')).toBe('January 27, 2025')
	})

	it('formats Chinese dates using Chinese conventions', () => {
		expect(formatDate('2025-01-27', 'zh')).toBe('2025年1月27日')
	})

	it('localizes custom Day.js tokens', () => {
		expect(formatDate('2025-01-27T13:30:00', 'zh', 'A h:mm')).toBe('下午 1:30')
	})

	it('leaves invalid input visible instead of throwing', () => {
		expect(formatDate('not-a-date', 'en')).toBe('not-a-date')
	})
})
