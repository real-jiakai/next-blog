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
// it cannot add attributes — hence this dedicated plugin.) Same-page fragment
// links (footnotes, headings, other comments) stay in the current tab.
function hardenLinks() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				const isFragment = String(node.properties?.href ?? '').startsWith('#')
				node.properties = {
					...node.properties,
					target: isFragment ? undefined : '_blank',
					rel: isFragment ? undefined : 'nofollow noopener noreferrer',
				}
			}
		})
	}
}

// remark-rehype emits footnote ids and hrefs unprefixed (clobberPrefix: ''), and
// the sanitizer then prefixes the ids only. Point the generated footnote links
// at those prefixed ids again.
function prefixFootnoteLinks() {
	const prefix = defaultSchema.clobberPrefix ?? 'user-content-'
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			const properties = node.properties ?? {}
			if (
				node.tagName === 'a' &&
				(properties.dataFootnoteRef !== undefined ||
					properties.dataFootnoteBackref !== undefined) &&
				typeof properties.href === 'string' &&
				properties.href.startsWith('#')
			) {
				properties.href = `#${prefix}${properties.href.slice(1)}`
			}
		})
	}
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkGemoji)
	.use(remarkRehype, { allowDangerousHtml: true, clobberPrefix: '' })
	.use(rehypeRaw)
	.use(hardenLinks)
	.use(rehypeSanitize, schema)
	.use(prefixFootnoteLinks)
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

// Plain-text rendering for notification emails. Collects the text nodes of the
// sanitized tree, so attribute values never leak and every character
// reference is already decoded.
export async function commentToPlainText(markdown: string): Promise<string> {
	const tree = (await processor.run(processor.parse(markdown || ''))) as Root
	const parts: string[] = []
	visit(tree, 'text', (node) => {
		parts.push(node.value)
	})
	return parts.join(' ').replace(/\s+/g, ' ').trim()
}
