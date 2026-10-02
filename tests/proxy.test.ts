import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { PostMetadata } from '@/lib/posts'
import { proxy } from '@/proxy'

// The proxy decides what the client router may fetch from the same post data
// the pages prerender from; this stands in for the posts directory.
const posts: Record<'zh' | 'en', PostMetadata[]> = {
	zh: [
		{ year: 2022, month: 4, slug: 'weekly-issue-01', filename: 'issue-01.md' },
		{ year: 2026, month: 1, slug: 'weekly-issue-23', filename: 'issue-23.md' },
	],
	en: [{ year: 2022, month: 4, slug: 'weekly-issue-01', filename: 'issue-01.md' }],
}

vi.mock('@/lib/posts', () => ({
	getAllPostMetadata: (locale: 'zh' | 'en') => posts[locale],
}))

function run(path: string, headers: Record<string, string> = {}) {
	return proxy(new NextRequest(`https://example.com${path}`, { headers }))
}

// What reaches the proxy when the client router fetches a page: Next has
// already removed the `rsc` header and the `_rsc` query; the router's
// `next-url` (the page it is on) and the browser's Fetch Metadata remain.
function runRouterFetch(path: string) {
	return run(path, { 'next-url': '/zh/about', 'sec-fetch-dest': 'empty' })
}

describe('proxy', () => {
	it.each([
		['/%7Ah', 'https://example.com/'],
		['/%7Ah/about?probe=1', 'https://example.com/about?probe=1'],
		['/z%68/2025/01/%E5%91%A8', 'https://example.com/2025/01/%E5%91%A8'],
		['/%65n/about', 'https://example.com/en/about'],
	])('sends the percent-encoded locale in %s to its canonical URL', (path, location) => {
		const response = run(path)
		expect(response.status).toBe(308)
		expect(response.headers.get('location')).toBe(location)
	})

	it('canonicalizes a percent-encoded locale before judging a router fetch', () => {
		const response = runRouterFetch('/%65n/about')
		expect(response.status).toBe(308)
		expect(response.headers.get('location')).toBe('https://example.com/en/about')
	})

	it.each([
		['/en', 'en'],
		['/en/missing', 'en'],
		['/english', 'zh'],
		['/about', 'zh'],
		['/%E0%A4%A', 'zh'],
		// Document requests for unknown pages keep the server-rendered 404.
		['/2026/01/not-a-post', 'zh'],
		['/en/page/999', 'en'],
		['/fr', 'zh'],
	])('passes %s through with the %s locale header', (path, locale) => {
		const response = run(path)
		expect(response.status).toBe(200)
		expect(response.headers.get('location')).toBeNull()
		expect(response.headers.get('x-middleware-request-x-blog-locale')).toBe(locale)
	})

	it.each([
		// A page's own fetch() of a file is not a router navigation.
		['fetch', '/index.xml', { 'sec-fetch-dest': 'empty' }],
		['fetch', '/js/APlayer.min.js', { 'sec-fetch-dest': 'empty', 'sec-fetch-mode': 'cors' }],
		['document', '/2026/01/not-a-post', { 'sec-fetch-dest': 'document' }],
		['iframe', '/fr', { 'sec-fetch-dest': 'iframe' }],
		// Next answers subresource requests for missing files itself.
		['image', '/en/2026/01/nope.png', { 'sec-fetch-dest': 'image' }],
	])('leaves a %s request for %s to the router', (_kind, path, headers) => {
		const response = run(path, headers)
		expect(response.status).toBe(200)
		expect(response.headers.get('x-middleware-next')).toBe('1')
	})

	it.each([
		['/', 'zh'],
		['/en', 'en'],
		['/about', 'zh'],
		['/en/about', 'en'],
		['/2022/04/weekly-issue-01', 'zh'],
		['/2026/01/weekly-issue-23', 'zh'],
		['/en/2022/04/weekly-issue-01', 'en'],
		['/2026/01/weekly-issue-%32%33', 'zh'],
	])('lets the router fetch the prerendered page %s', (path, locale) => {
		const response = runRouterFetch(path)
		expect(response.status).toBe(200)
		expect(response.headers.get('x-middleware-next')).toBe('1')
		expect(response.headers.get('x-middleware-request-x-blog-locale')).toBe(locale)
	})

	it.each([
		'/2026/01/not-a-post',
		'/en/2026/01/weekly-issue-23',
		// No longer pages. In the server the config redirects answer these
		// before the proxy runs; were one missed, the router would still get a
		// 404 here rather than the 500 of a page that was never generated.
		'/page/2',
		'/en/page/999',
		'/archive',
		'/en/archive',
		'/page/abc',
		'/fr',
		'/fr/about',
		'/en/definitely-missing',
		'/%E0%A4%A',
	])('answers the router fetch for the unknown page %s with an uncacheable 404', (path) => {
		const response = runRouterFetch(path)
		expect(response.status).toBe(404)
		expect(response.headers.get('content-type')).toBeNull()
		expect(response.headers.get('cache-control')).toBe(
			'private, no-cache, no-store, max-age=0, must-revalidate',
		)
		// Neither forwarded to the router nor redirected.
		expect(response.headers.get('x-middleware-next')).toBeNull()
		expect(response.headers.get('location')).toBeNull()
	})
})
