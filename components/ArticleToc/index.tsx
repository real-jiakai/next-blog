'use client'

import parseHeading from '@/lib/parseHeading'

interface ArticleTocProps {
  contentMarkdown: string
  showtoc: boolean
  tocLabel: string
}

interface Heading {
  depth: number
  value: string
  id: string
}

export default function ArticleToc({ contentMarkdown, showtoc, tocLabel }: ArticleTocProps) {
	const headings: Heading[] = parseHeading(contentMarkdown)

	if (!showtoc || headings.length === 0) {
		return null
	}

	return (
		<nav>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
				{tocLabel}
			</h3>
			<ul className="space-y-2.5 text-sm list-none">
				{headings.map((heading, index) => (
					<li key={index}>
						<a
							href={`#${heading.id}`}
							className={`block text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${
								heading.depth === 3 ? 'pl-4' : ''
							}`}
						>
							{heading.value}
						</a>
					</li>
				))}
			</ul>
		</nav>
	)
}
