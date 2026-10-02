import NextBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = NextBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})

// Content-Security-Policy scoped to the resources the site actually loads:
// self, the umami analytics host, Cloudflare Turnstile (script + widget frame),
// and bilibili post-embed iframes. 'unsafe-inline' is required for the styles
// the lightbox injects at runtime and the sizing styles on post media, and
// for Next's inline bootstrap scripts (static export rules out per-request
// nonces). img/media are left broad (https:) because post content embeds
// images from arbitrary hosts.
// React dev mode evaluates modules with eval, so `next dev` needs
// 'unsafe-eval' in script-src or hydration crashes; it is never emitted in
// production builds.
const isDev = process.env.NODE_ENV === 'development'

const csp = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://umami.gujiakai.top https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
	"script-src-attr 'none'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self' https://umami.gujiakai.top https://challenges.cloudflare.com",
	"media-src 'self' https:",
	'frame-src https://challenges.cloudflare.com https://player.bilibili.com',
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'self'",
	'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
	{ key: 'Content-Security-Policy', value: csp },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{
		key: 'Strict-Transport-Security',
		value: 'max-age=63072000; includeSubDomains; preload',
	},
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=()',
	},
]

// Next serves public/ files with max-age=0, so every view of a post would
// revalidate its clips. These names are not content-hashed, so the cache is
// a week rather than immutable; a replaced file needs a new name to reach
// visitors sooner.
const staticAssetCache = [
	{
		key: 'Cache-Control',
		value: 'public, max-age=604800, stale-while-revalidate=86400',
	},
]
const cachedStaticAssets = ['/video/:path*', '/favicon.ico']

export default withBundleAnalyzer({
	pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
	reactStrictMode: true,
	poweredByHeader: false,
	output: 'standalone',
	turbopack: {},
	experimental: {
		globalNotFound: true,
	},
	async headers() {
		return [
			{ source: '/:path*', headers: securityHeaders },
			...cachedStaticAssets.map((source) => ({
				source,
				headers: staticAssetCache,
			})),
		]
	},
	// Canonicalize explicit default-locale URLs before applying the prefix-less
	// Chinese route rewrites below. The home page lists every issue, so the
	// old pagination and archive URLs lead there; the more specific `/zh`
	// rules come first so they take one hop, not two. A link to an archive
	// year (`/archive#2024`) keeps its fragment across the redirect and lands
	// on that year's section of the contents page.
	async redirects() {
		return [
			{ source: '/page/:page(\\d+)', destination: '/', permanent: true },
			{ source: '/en/page/:page(\\d+)', destination: '/en', permanent: true },
			{ source: '/zh/page/:page(\\d+)', destination: '/', permanent: true },
			{ source: '/archive', destination: '/', permanent: true },
			{ source: '/en/archive', destination: '/en', permanent: true },
			{ source: '/zh/archive', destination: '/', permanent: true },
			{ source: '/zh', destination: '/', permanent: true },
			{ source: '/zh/:path*', destination: '/:path*', permanent: true },
		]
	},
	// Map prefix-less Chinese routes directly onto the locale segment. Config
	// rewrites run after redirects, so their `/zh` destinations are not fed back
	// through the canonical redirect (which caused a self-redirect in Proxy).
	async rewrites() {
		return [
			{ source: '/', destination: '/zh' },
			{ source: '/about', destination: '/zh/about' },
			{
				source: '/:year(\\d{4})/:month(\\d{2})/:slug',
				destination: '/zh/:year/:month/:slug',
			},
		]
	},
	// The optimizer serves the contents page's lead cover. It accepts only the
	// two image hosts the posts use; `localPatterns: []` refuses every local
	// path, so /_next/image cannot be made to buffer and cache arbitrary public
	// files (the reason it used to be switched off). WebP only, since encoding
	// AVIF is slow on the one-CPU container, and widths limited to what the
	// cover's `sizes` can pick. The CDN URLs are content-addressed, so a
	// month's cache is safe.
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'cdn.sa.net', pathname: '/**' },
			{ protocol: 'https', hostname: 'vip2.loli.net', pathname: '/**' },
		],
		localPatterns: [],
		formats: ['image/webp'],
		deviceSizes: [640, 750, 828, 1080],
		// The 14rem and 18rem desktop cover columns at 1x and 2x; the 20rem
		// tablet box draws on 448 and 640.
		imageSizes: [224, 288, 448, 576],
		qualities: [75],
		minimumCacheTTL: 2678400,
	},
})
