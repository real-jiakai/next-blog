import GitHubIcon from '@mui/icons-material/GitHub'

export default function Footer() {
	const githubRepository =
		process.env.NEXT_PUBLIC_GITHUB_REPO ||
		'https://github.com/real-jiakai/next-blog'
	const footerName = process.env.NEXT_PUBLIC_FOOTER || 'Jiakai Gu'

	return (
		<footer className="flex justify-center items-center my-3 space-x-3">
			<span className="text-base text-center font-medium">
				© 2022-{new Date().getFullYear()} {footerName}
			</span>
			<span className="mx-2 text-gray-400" aria-hidden>|</span>
			<a
				href={githubRepository}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub repository"
				title="GitHub repository"
			>
				<GitHubIcon aria-hidden />
			</a>
		</footer>
	)
}
