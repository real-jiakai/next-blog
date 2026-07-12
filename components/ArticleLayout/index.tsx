import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Locale } from '@/lib/i18n-config'

interface ArticleLayoutProps {
  children: React.ReactNode
  lang: Locale
  dict: {
    common: {
      Home: string
      Archive: string
      About: string
      RSS: string
      Navigation: string
      OpenMenu: string
      CloseMenu: string
      ChangeLanguage: string
      MoreOptions: string
      ToggleTheme: string
    }
  }
}

export default function ArticleLayout({ children, lang, dict }: ArticleLayoutProps) {
	return (
		<div className="flex flex-col min-h-screen">
			<Header lang={lang} dict={dict} />

			<main className="text-lg font-sans antialiased font-normal py-4 md:py-6 flex-grow">
				{children}
			</main>

			<Footer />
		</div>
	)
}
