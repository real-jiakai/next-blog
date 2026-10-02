import GitHubIcon from '@mui/icons-material/GitHub'
import { i18n } from '@/lib/i18n-config'
import { getAllPostMetadata } from '@/lib/posts'
import { CommonDictionary } from '@/lib/dictionaries'

interface FooterProps {
  dict: { common: CommonDictionary }
}

// The range ends at the newest post, not at today: pages are prerendered, so a
// clock read here would stay at the year of the last build.
function getLatestPostYear() {
	const years = i18n.locales.flatMap((locale) =>
		getAllPostMetadata(locale).map((post) => post.year)
	)
	return years.length > 0 ? Math.max(...years) : new Date().getFullYear()
}

export default function Footer({ dict }: FooterProps) {
	const githubRepository =
		process.env.NEXT_PUBLIC_GITHUB_REPO ||
		'https://github.com/real-jiakai/next-blog'
	const footerName = process.env.NEXT_PUBLIC_FOOTER || 'Jiakai Gu'

	return (
		// A full-width rule marks the end of the page, which the footer previously
		// lacked entirely. No background tint: the rule is separation enough, and
		// a darker band only drew the eye to the least interesting part of the
		// page.
		<footer className="border-t border-site-line">
			<div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3.5 text-site-muted md:px-6">
				<span className="text-center text-sm font-medium md:text-base">
					© 2022-{getLatestPostYear()} {footerName}
				</span>
				<span aria-hidden className="hidden h-4 w-px bg-site-line sm:block" />
				<a
					href={githubRepository}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={dict.common.GitHubRepository}
					title={dict.common.GitHubRepository}
					className="inline-flex items-center rounded p-1 transition-colors hover:text-blue-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400"
				>
					<GitHubIcon aria-hidden fontSize="small" />
				</a>
			</div>
		</footer>
	)
}
