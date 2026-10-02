import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import { Locale } from '@/lib/i18n-config'
import { CommonDictionary } from '@/lib/dictionaries'

interface ArticleLayoutProps {
  children: React.ReactNode
  lang: Locale
  dict: { common: CommonDictionary }
}

export default function ArticleLayout({ children, lang, dict }: ArticleLayoutProps) {
	return (
		<>
			<div className="flex flex-col min-h-screen">
				{/* See Layout: the client header gets only the strings it reads. */}
				<Header lang={lang} dict={{ common: dict.common }} />

				<main className="text-lg font-sans antialiased font-normal py-4 md:py-6 flex-grow">
					{children}
				</main>

				<Footer dict={dict} />
			</div>
			<ScrollToTop label={dict.common.BackToTop} />
		</>
	)
}
