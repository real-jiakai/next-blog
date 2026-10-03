import { i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { getAllPostMetadata } from '@/lib/posts'

interface SiteFooterProps {
	lang: Locale
	dict: { common: CommonDictionary }
}

const linkClass =
	'underline decoration-site-line underline-offset-4 transition-colors hover:text-site-heading hover:decoration-site-accent'

// The years run from the first post to the newest, not to today: pages are
// prerendered, so a clock read here would stay at the year of the last build.
function getPostYears(): { first: number, last: number } {
	const years = i18n.locales.flatMap((locale) =>
		getAllPostMetadata(locale).map((post) => post.year)
	)
	const now = new Date().getFullYear()
	return years.length > 0
		? { first: Math.min(...years), last: Math.max(...years) }
		: { first: now, last: now }
}

/**
 * The colophon: the copyright and the source link. It repeats nothing the
 * page already shows: the brand sits in the header, the run of issues on the
 * contents page and in each issue's kicker, and About in the header at every
 * width. The header shows the feed from md up, so the feed link here is for
 * phones only. Phones centre everything; from md up the links move to the
 * right. A full-width hairline ends the page; there is no tinted band, which
 * only drew the eye to the least interesting part of it.
 */
export default function SiteFooter({ lang, dict }: SiteFooterProps) {
	const githubRepository =
		process.env.NEXT_PUBLIC_GITHUB_REPO ||
		'https://github.com/real-jiakai/next-blog'
	const footerName = process.env.NEXT_PUBLIC_FOOTER || 'Jiakai Gu'
	const { first, last } = getPostYears()
	// An en dash: the years are a range.
	const years = first === last ? String(last) : `${first}–${last}`

	return (
		<footer className="border-t border-site-line">
			{/* Between md and lg the page margin is too narrow for the
			    back-to-top button, which would sit on the links here. */}
			<div className="mx-auto grid w-full max-w-4xl justify-items-center gap-3 px-4 py-8 text-center text-[0.8125rem] text-site-muted md:grid-cols-[1fr_auto] md:items-end md:justify-items-stretch md:px-6 md:text-left md:max-lg:pr-[4.75rem]">
				<p className="m-0">{`© ${years} ${footerName}`}</p>
				<p className="m-0 flex gap-x-5">
					{/* The header's feed link starts at md. */}
					<a
						href={lang === 'en' ? '/en/index.xml' : '/index.xml'}
						type="application/atom+xml"
						className={`md:hidden ${linkClass}`}
					>
						{dict.common.RSS}
					</a>
					<a
						href={githubRepository}
						target="_blank"
						rel="noopener noreferrer"
						title={dict.common.GitHubRepository}
						className={linkClass}
					>
						GitHub<span aria-hidden> ↗</span>
					</a>
				</p>
			</div>
		</footer>
	)
}
