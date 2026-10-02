import { describe, expect, it } from 'vitest'
import nextConfig from '@/next.config.mjs'

describe('security headers', () => {
	it('allows the Cloudflare Web Analytics beacon script in script-src', async () => {
		const [{ headers }] = await nextConfig.headers()
		const csp = headers.find(
			(header) => header.key === 'Content-Security-Policy'
		)?.value
		// The trailing space keeps this from matching script-src-attr.
		const scriptSrc = csp
			?.split('; ')
			.find((directive) => directive.startsWith('script-src '))

		expect(scriptSrc?.split(' ')).toContain(
			'https://static.cloudflareinsights.com'
		)
	})

	it('does not advertise the framework', () => {
		expect(nextConfig.poweredByHeader).toBe(false)
	})
})

describe('static asset caching', () => {
	const CACHED = 'public, max-age=604800, stale-while-revalidate=86400'

	it('caches post clips and the favicon for a week', async () => {
		const rules = await nextConfig.headers()
		const cached = rules.filter((rule) =>
			rule.headers.some(
				(header) => header.key === 'Cache-Control' && header.value === CACHED
			)
		)

		expect(cached.map((rule) => rule.source)).toEqual([
			'/video/:path*',
			'/favicon.ico',
		])
	})

	it('keeps the security headers on every route, cached assets included', async () => {
		const [first, ...rest] = await nextConfig.headers()

		expect(first.source).toBe('/:path*')
		expect(first.headers.map((header) => header.key)).toEqual(
			expect.arrayContaining([
				'Content-Security-Policy',
				'X-Content-Type-Options',
				'Strict-Transport-Security',
			])
		)
		expect(first.headers.some((header) => header.key === 'Cache-Control')).toBe(
			false
		)
		for (const rule of rest) {
			expect(rule.headers.map((header) => header.key)).toEqual(['Cache-Control'])
		}
	})
})

describe('image optimizer', () => {
	it('is off, so /_next/image cannot buffer arbitrary public files', () => {
		expect(nextConfig.images).toEqual({ unoptimized: true })
	})
})

describe('locale route configuration', () => {
	it('canonicalizes explicit Chinese prefixes', async () => {
		expect(await nextConfig.redirects()).toEqual([
			{ source: '/page/1', destination: '/', permanent: true },
			{ source: '/en/page/1', destination: '/en', permanent: true },
			{ source: '/zh/page/1', destination: '/', permanent: true },
			{ source: '/zh', destination: '/', permanent: true },
			{ source: '/zh/:path*', destination: '/:path*', permanent: true },
		])
	})

	it('maps only known prefix-less Chinese page shapes', async () => {
		expect(await nextConfig.rewrites()).toEqual([
			{ source: '/', destination: '/zh' },
			{ source: '/about', destination: '/zh/about' },
			{ source: '/archive', destination: '/zh/archive' },
			{ source: '/page/:page', destination: '/zh/page/:page' },
			{
				source: '/:year(\\d{4})/:month(\\d{2})/:slug',
				destination: '/zh/:year/:month/:slug',
			},
		])
	})
})
