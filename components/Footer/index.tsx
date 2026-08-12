import GitHubIcon from '@mui/icons-material/GitHub'

export default function Footer() {
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
					© 2022-{new Date().getFullYear()} {footerName}
				</span>
				<span aria-hidden className="hidden h-4 w-px bg-site-line sm:block" />
				<a
					href={githubRepository}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="GitHub repository"
					title="GitHub repository"
					className="inline-flex items-center rounded p-1 transition-colors hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-blue-400"
				>
					<GitHubIcon aria-hidden className="h-5 w-5" />
				</a>
			</div>
		</footer>
	)
}
