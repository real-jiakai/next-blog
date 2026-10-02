import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import ScrollToTop from '@/components/ScrollToTop'
import { Locale } from '@/lib/i18n-config'
import { CommonDictionary } from '@/lib/dictionaries'

interface LayoutProps {
	children: React.ReactNode
	lang: Locale
	dict: { common: CommonDictionary }
}

/**
 * The frame of every page: header, the page itself, footer. Pages set their
 * own width and vertical spacing; <main> adds none.
 */
export default function Layout({
	children,
	lang,
	dict,
}: LayoutProps) {
	return (
		<>
			{/* svh, not vh: on phones 100vh includes the collapsed URL bar, which
			    forces a scrollbar even when the content fits the visible screen */}
			<div className="flex min-h-svh flex-col">
				{/* Only the strings the header reads: it is a client component, so
				    whatever it is handed is serialized into every page. */}
				<SiteHeader lang={lang} dict={{ common: dict.common }} />

				{/* No `antialiased`: grayscale smoothing thins Han strokes on macOS.
				    No inherited text size either; each element sets its own. */}
				<main className="flex w-full flex-1 flex-col font-sans">
					{children}
				</main>

				<SiteFooter lang={lang} dict={dict} />
			</div>
			<ScrollToTop label={dict.common.BackToTop} />
		</>
	)
}
