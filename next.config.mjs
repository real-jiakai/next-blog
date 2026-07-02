import NextBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = NextBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})

// Content-Security-Policy scoped to the resources the site actually loads:
// self, the umami analytics host, Cloudflare Turnstile (script + widget frame),
// and bilibili post-embed iframes. 'unsafe-inline' is required for the styles
// Emotion/MUI and the lightbox inject at runtime, and for Next's inline
// bootstrap scripts (static export rules out per-request nonces). img/media are
// left broad (https:) because post content embeds images from arbitrary hosts.
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://umami.gujiakai.top https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: https:",
	"font-src 'self' data:",
	"connect-src 'self' https://umami.gujiakai.top https://challenges.cloudflare.com",
	"media-src 'self' https:",
	"frame-src https://challenges.cloudflare.com https://player.bilibili.com",
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

export default withBundleAnalyzer({
	pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
	reactStrictMode: true,
	output: 'standalone',
	turbopack: {},
	async headers() {
		return [{ source: '/:path*', headers: securityHeaders }]
	},
	// i18n is now handled by proxy, no config needed here
	async rewrites() {
		return [
			{
				source: '/:locale/index.xml',
				destination: '/index.xml',
			},
		]
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'image.gujiakai.top',
			},
		],
	},
})
