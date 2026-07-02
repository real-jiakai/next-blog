import { visit } from 'unist-util-visit'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remark2rehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import gfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import type { Element, ElementContent, Text } from 'hast'

export interface Heading {
  depth: number
  value: string
  id: string
}

// Collect all descendant text so headings containing inline markup
// (code, bold, links) are not truncated to their first text node.
function collectText(node: Element | ElementContent): string {
	if (node.type === 'text') {
		return (node as Text).value
	}
	if ('children' in node && Array.isArray(node.children)) {
		return node.children.map(collectText).join('')
	}
	return ''
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
					const heading: Heading = {
						depth,
						value: collectText(node),
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
