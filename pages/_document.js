import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script'

export default function Document() {
	return (
		<Html>
			<Head>
				<meta name="description" content="This is a blog demo built with Next.js." />
			</Head>
			<body>
				<Main />
				<NextScript />
				<Script src="/js/APlayer.min.js" strategy="beforeInteractive" />
			</body>
		</Html>
	)
}