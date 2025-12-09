import NextBundleAnalyzer from '@next/bundle-analyzer'
import nextTranslate from 'next-translate-plugin'

const withBundleAnalyzer = NextBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true',
})

export default nextTranslate(withBundleAnalyzer({
	pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
	reactStrictMode: true,
	output: 'standalone',
	webpack: (config) => {
		config.resolve.fallback = { fs: false }
		return config
	},
	i18n: {
		defaultLocale: 'zh',
		locales: ['zh', 'en']
	},
	async rewrites() {
		return [
		  {
				source: '/:locale/index.xml',
				destination: '/index.xml',
				locale: false,
		  },
		]
	},
	images: {
		remotePatterns: [
		  {
				protocol: 'https',
				hostname: 'image.gujiakai.top'
		  },
		],
	}
}))
