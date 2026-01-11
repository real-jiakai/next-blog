import { visit } from 'unist-util-visit'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remark2rehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import gfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import type { Element, Text } from 'hast'

export interface Heading {
  depth: number
  value: string
  id: string
}

export default function parseHeading(contentMarkdown: string): Heading[] {
	const headings: Heading[] = []

	unified()
		.use(remarkParse)
		.use(gfm)
		.use(remark2rehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSlug)
		.use(() => (tree) => {
			visit(tree, 'element', (node: Element) => {
				// 只解析 h2 和 h3
				if (node.tagName === 'h2' || node.tagName === 'h3') {
					const depth = parseInt(node.tagName.charAt(1))
					const id = node.properties?.id as string
					const textContent =
					(node.children.find((child): child is Text => child.type === 'text') as Text)?.value ||
					node.children
						.map((child) => ((child as Text).type === 'text' ? (child as Text).value : ''))
						.join('')
					const heading: Heading = {
						depth,
						value: textContent,
						id,
					}
					headings.push(heading)
				}
			})
		})
		.use(rehypeStringify)
		.processSync(contentMarkdown)

	return headings
}
