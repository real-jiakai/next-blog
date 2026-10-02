import { describe, expect, it } from 'vitest'
import { formatDate, formatMonthYear } from '@/lib/formatDate'

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

describe('formatMonthYear', () => {
	it('names the month and year in each locale', () => {
		expect(formatMonthYear('2022-04-09', 'zh')).toBe('2022年4月')
		expect(formatMonthYear('2022-04-09', 'en')).toBe('April 2022')
	})

	it('reads a first-of-month date in local time, not as the previous month', () => {
		expect(formatMonthYear('2022-04-01', 'en')).toBe('April 2022')
	})

	it('leaves invalid input visible instead of throwing', () => {
		expect(formatMonthYear('not-a-date', 'zh')).toBe('not-a-date')
	})
})
