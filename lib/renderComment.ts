import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkGemoji from 'remark-gemoji'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

// Allow target/rel on <a> so the hardened link attributes survive sanitization.
// The default schema permits href but not target.
const schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
	},
}

// Force safe link attributes on every anchor. Runs BEFORE rehype-sanitize so the
// sanitizer validates the final attribute values. (rehype-sanitize only strips —
// it cannot add attributes — hence this dedicated plugin.)
function hardenLinks() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				node.properties = {
					...node.properties,
					target: '_blank',
					rel: 'nofollow noopener noreferrer',
				}
			}
		})
	}
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkGemoji)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(hardenLinks)
	.use(rehypeSanitize, schema)
	.use(rehypeStringify)

export async function renderCommentHtml(markdown: string): Promise<string> {
	const file = await processor.process(markdown || '')
	return String(file)
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

export function escapeHtml(input: string): string {
	return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

// Plain-text rendering for notification emails. Strips tags from the sanitized
// HTML, then decodes the handful of entities Markdown introduces. Decode &amp;
// LAST so already-decoded sequences are not re-decoded.
export async function commentToPlainText(markdown: string): Promise<string> {
	const html = await renderCommentHtml(markdown)
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim()
}
