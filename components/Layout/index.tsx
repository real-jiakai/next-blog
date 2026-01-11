import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import { Locale } from '@/lib/i18n-config'

interface LayoutProps {
  children: React.ReactNode
  lang: Locale
  dict: {
    common: {
      Home: string
      Archive: string
      About: string
      RSS: string
    }
  }
}

export default function Layout({ children, lang, dict }: LayoutProps) {
	return (
		<>
			<div className="flex flex-col min-h-screen">
				<Header lang={lang} dict={dict} />

				<main className="text-lg font-sans antialiased font-normal flex-grow flex flex-col w-full py-6">
					{children}
				</main>

				<Footer />
			</div>
			<ScrollToTop />
		</>
	)
}
