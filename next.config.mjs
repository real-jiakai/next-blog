import NextBundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = NextBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer({
	pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
	reactStrictMode: true,
	output: 'standalone',
	turbopack: {},
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
