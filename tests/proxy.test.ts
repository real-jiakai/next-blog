import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

function run(path: string) {
	return proxy(new NextRequest(`https://example.com${path}`))
}

describe('proxy', () => {
	it.each([
		['/%7Ah', 'https://example.com/'],
		['/%7Ah/about?probe=1', 'https://example.com/about?probe=1'],
		['/z%68/2025/01/%E5%91%A8', 'https://example.com/2025/01/%E5%91%A8'],
		['/%65n/archive', 'https://example.com/en/archive'],
	])('sends the percent-encoded locale in %s to its canonical URL', (path, location) => {
		const response = run(path)
		expect(response.status).toBe(308)
		expect(response.headers.get('location')).toBe(location)
	})

	it.each([
		['/en', 'en'],
		['/en/missing', 'en'],
		['/english', 'zh'],
		['/about', 'zh'],
		['/%E0%A4%A', 'zh'],
	])('passes %s through with the %s locale header', (path, locale) => {
		const response = run(path)
		expect(response.headers.get('location')).toBeNull()
		expect(response.headers.get('x-middleware-request-x-blog-locale')).toBe(locale)
	})
})
