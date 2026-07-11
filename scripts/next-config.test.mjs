import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config.mjs'

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
