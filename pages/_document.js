import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

export default function Document() {
	return (
		<Html>
			<Head>
				<meta name="description" content={process.env.NEXT_PUBLIC_SITE_DESCRIPTION} />
				<meta name="keywords" content={process.env.NEXT_PUBLIC_SITE_KEYWORDS} />
				<script async src="https://umami.gujiakai.top/script.js" data-website-id="89984862-f5d1-4d17-9cb1-54c121ea604d"></script>
			</Head>
			<body>
				<Main />
				<NextScript />
				<Script src="/js/APlayer.min.js" strategy="beforeInteractive" />
			</body>
		</Html>
	)
}