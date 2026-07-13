import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'
import { Locale } from '@/lib/i18n-config'

interface LayoutProps {
  children: React.ReactNode
  lang: Locale
  naturalFooter?: boolean
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

export default function Layout({
	children,
	lang,
	dict,
	naturalFooter = false,
}: LayoutProps) {
	return (
		<>
			<div className={`flex flex-col ${naturalFooter ? '' : 'min-h-screen'}`}>
				<Header lang={lang} dict={dict} />

				<main className={`text-lg font-sans antialiased font-normal flex flex-col w-full py-4 md:py-6 ${naturalFooter ? '' : 'flex-grow'}`}>
					{children}
				</main>

				<Footer />
			</div>
			<ScrollToTop />
		</>
	)
}
