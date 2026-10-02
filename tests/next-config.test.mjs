import { describe, expect, it } from 'vitest'
import nextConfig from '@/next.config.mjs'
import { getIssueIndex } from '@/lib/posts'

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
	it('serves only the two cover hosts and refuses every local path', () => {
		// `localPatterns: []` is what keeps /_next/image from buffering and
		// caching arbitrary public files now that the optimizer is on: Next's
		// hasLocalMatch([]) matches nothing, while leaving it undefined would
		// allow every local URL.
		expect(nextConfig.images).toMatchObject({
			localPatterns: [],
			formats: ['image/webp'],
			qualities: [75],
			minimumCacheTTL: 2678400,
		})
		expect(nextConfig.images.unoptimized).toBeUndefined()
		// Next refuses a config with more than 50 remote patterns.
		expect(nextConfig.images.remotePatterns.length).toBeGreaterThan(0)
		expect(nextConfig.images.remotePatterns.length).toBeLessThanOrEqual(50)
		for (const pattern of nextConfig.images.remotePatterns) {
			expect(pattern.protocol).toBe('https')
			expect(['cdn.sa.net', 'vip2.loli.net']).toContain(pattern.hostname)
			// An exact path and no query string: never a wildcard on a public host.
			expect(pattern.pathname).not.toContain('*')
			expect(pattern.search).toBe('')
		}
	})

	it('allows exactly the covers the contents page can show', () => {
		// A cover missing from the list would get a 400 from the optimizer and
		// leave the lead issue with an empty box; a stale entry would keep a URL
		// open for nothing. Run `pnpm images:metadata` after changing a cover.
		const allowed = nextConfig.images.remotePatterns.map(
			(pattern) => `${pattern.protocol}://${pattern.hostname}${pattern.pathname}`
		)
		const covers = new Set(
			['zh', 'en'].flatMap((locale) =>
				getIssueIndex(locale).flatMap((issue) => (issue.cover ? [issue.cover.src] : []))
			)
		)

		expect([...covers].sort()).toEqual([...allowed].sort())
	})
})

describe('locale route configuration', () => {
	it('canonicalizes explicit Chinese prefixes and folds pagination and the archive into the contents', async () => {
		expect(await nextConfig.redirects()).toEqual([
			{ source: '/page/:page(\\d+)', destination: '/', permanent: true },
			{ source: '/en/page/:page(\\d+)', destination: '/en', permanent: true },
			{ source: '/zh/page/:page(\\d+)', destination: '/', permanent: true },
			{ source: '/archive', destination: '/', permanent: true },
			{ source: '/en/archive', destination: '/en', permanent: true },
			{ source: '/zh/archive', destination: '/', permanent: true },
			{ source: '/zh', destination: '/', permanent: true },
			{ source: '/zh/:path*', destination: '/:path*', permanent: true },
		])
	})

	it('maps only known prefix-less Chinese page shapes', async () => {
		expect(await nextConfig.rewrites()).toEqual([
			{ source: '/', destination: '/zh' },
			{ source: '/about', destination: '/zh/about' },
			{
				source: '/:year(\\d{4})/:month(\\d{2})/:slug',
				destination: '/zh/:year/:month/:slug',
			},
		])
	})
})
