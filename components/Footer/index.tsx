import GitHubIcon from '@mui/icons-material/GitHub'

export default function Footer() {
	return (
		<div className="flex justify-center items-center my-3 space-x-3">
			<span className="text-md text-center font-medium">
        © 2022-{new Date().getFullYear()} {process.env.NEXT_PUBLIC_FOOTER}
			</span>
			<span className="mx-2 text-gray-400">|</span>
			<a href={process.env.NEXT_PUBLIC_GITHUB_REPO} target="_blank" rel="noopener noreferrer">
				<GitHubIcon />
			</a>
		</div>
	)
}
