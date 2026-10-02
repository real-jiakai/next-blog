import { i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { formatIssueRange } from '@/lib/issues'
import { getAllPostMetadata, getIssueStats } from '@/lib/posts'

interface SiteFooterProps {
	lang: Locale
	dict: { common: CommonDictionary }
}

const linkClass =
	'underline decoration-site-line underline-offset-4 transition-colors hover:text-site-heading hover:decoration-site-accent'

// The range ends at the newest post, not at today: pages are prerendered, so a
// clock read here would stay at the year of the last build.
function getLatestPostYear() {
	const years = i18n.locales.flatMap((locale) =>
		getAllPostMetadata(locale).map((post) => post.year)
	)
	return years.length > 0 ? Math.max(...years) : new Date().getFullYear()
}

/**
 * A colophon rather than a centred credit line: the periodical's name and run
 * of issues, the copyright, and the source link. About and the feed are not
 * repeated here; the sticky header carries both on every page. Phones centre
 * the two lines; from md up the link moves to the right. A full-width
 * hairline ends the page; there is no tinted band, which only drew the eye to
 * the least interesting part of it.
 */
export default function SiteFooter({ lang, dict }: SiteFooterProps) {
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'
	const githubRepository =
		process.env.NEXT_PUBLIC_GITHUB_REPO ||
		'https://github.com/real-jiakai/next-blog'
	const footerName = process.env.NEXT_PUBLIC_FOOTER || 'Jiakai Gu'
	const range = formatIssueRange(dict.common, getIssueStats(lang))

	return (
		<footer className="border-t border-site-line">
			{/* Between md and lg the page margin is too narrow for the
			    back-to-top button, which would sit on the link here. */}
			<div className="mx-auto grid w-full max-w-4xl justify-items-center gap-3 px-4 py-8 text-center text-[0.8125rem] text-site-muted md:grid-cols-[1fr_auto] md:items-end md:justify-items-stretch md:px-6 md:text-left md:max-lg:pr-[4.75rem]">
				<div>
					<p className="m-0 text-[0.9375rem] font-semibold text-site-heading">
						{siteTitle}
						{range && <span className="font-normal text-site-muted">{` · ${range}`}</span>}
					</p>
					{/* An en dash: the years are a range. */}
					<p className="m-0 mt-1">{`© 2022–${getLatestPostYear()} ${footerName}`}</p>
				</div>
				<a
					href={githubRepository}
					target="_blank"
					rel="noopener noreferrer"
					title={dict.common.GitHubRepository}
					className={linkClass}
				>
					GitHub<span aria-hidden> ↗</span>
				</a>
			</div>
		</footer>
	)
}
