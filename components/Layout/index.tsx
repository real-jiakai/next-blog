import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import { Locale } from '@/lib/i18n-config'
import { CommonDictionary } from '@/lib/dictionaries'

interface LayoutProps {
  children: React.ReactNode
  lang: Locale
  dict: { common: CommonDictionary }
}

export default function Layout({
	children,
	lang,
	dict,
}: LayoutProps) {
	return (
		<>
			{/* svh, not vh: on phones 100vh includes the collapsed URL bar, which
			    forces a scrollbar even when the content fits the visible screen */}
			<div className="flex flex-col min-h-svh">
				<Header lang={lang} dict={dict} />

				<main className="text-lg font-sans antialiased font-normal flex flex-col w-full py-4 flex-grow">
					{children}
				</main>

				<Footer />
			</div>
			<ScrollToTop />
		</>
	)
}
