import { visit } from 'unist-util-visit'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remark2rehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import gfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

export default function parseHeading(contentMarkdown) {
	const headings = []
	unified()
		.use(remarkParse)
		.use(gfm)
		.use(remark2rehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSlug)
		.use(() => (tree) => {
			visit(tree, 'element', (node) => {
				// 只解析 h2 和 h3
				if (node.tagName === 'h2' || node.tagName === 'h3') {
					const depth = parseInt(node.tagName.charAt(1))
					const id = node.properties.id
					const textContent = node.children.find(child => child.type === 'text')?.value ||
						node.children.map(child => child.type === 'text' ? child.value : '').join('')
					const heading = {
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
