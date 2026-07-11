import Markdown from 'react-markdown'
import type { PluggableList } from 'unified'
import gfm from 'remark-gfm'
import gemoji from 'remark-gemoji'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, {
	defaultSchema,
	type Options as SanitizeSchema,
} from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrism from 'rehype-prism-plus'
import { visit } from 'unist-util-visit'
import type { Element, Root, RootContent } from 'hast'
import type { ReactElement } from 'react'
import postImageDimensions from './post-image-dimensions.json'

export interface ArticleHeading {
	depth: number
	value: string
	id: string
}

export interface RenderedPost {
	content: ReactElement
	headings: ArticleHeading[]
}

const knownImageDimensions = postImageDimensions as Record<
	string,
	{ width: number; height: number }
>

const postSchema: SanitizeSchema = {
	...defaultSchema,
	tagNames: [
		...(defaultSchema.tagNames || []),
		'center',
		'figure',
		'figcaption',
		'iframe',
		'video',
		'source',
	],
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
		img: [
			...(defaultSchema.attributes?.img || []),
			'loading',
			'decoding',
			'width',
			'height',
		],
		iframe: [
			'src',
			'title',
			'width',
			'height',
			'allow',
			'allowFullScreen',
			'frameBorder',
			'scrolling',
			'className',
			'loading',
			'referrerPolicy',
			'sandbox',
		],
		video: [
			'src',
			'title',
			'controls',
			'width',
			'height',
			'preload',
			'poster',
			'className',
			'ariaDescribedBy',
		],
		figure: ['className'],
		figcaption: ['className', 'id'],
		source: ['src', 'type', 'media'],
	},
	protocols: {
		...defaultSchema.protocols,
		src: ['http', 'https'],
	},
}

function textContent(node: RootContent): string {
	if (node.type === 'text') return node.value
	if ('children' in node) return node.children.map(textContent).join('')
	return ''
}

function collectHeadings(target: ArticleHeading[]) {
	return function collectHeadingsPlugin() {
		return (tree: Root) => {
			visit(tree, 'element', (node: Element) => {
				if (!/^h[1-6]$/.test(node.tagName)) return
				const id = node.properties?.id
				if (typeof id !== 'string') return
				target.push({
					depth: Number(node.tagName.slice(1)),
					value: node.children.map(textContent).join(''),
					id,
				})
			})
		}
	}
}

function replaceUnsupportedEmbed(node: Element) {
	node.tagName = 'span'
	node.properties = { className: ['unsupported-embed'] }
	node.children = [{ type: 'text', value: '[Unsupported embed removed]' }]
}

function hardenEmbeds() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'iframe') {
				const rawSource = node.properties?.src
				if (typeof rawSource !== 'string') {
					replaceUnsupportedEmbed(node)
					return
				}

				try {
					const source = new URL(
						rawSource.startsWith('//') ? `https:${rawSource}` : rawSource
					)
					if (source.protocol !== 'https:' || source.hostname !== 'player.bilibili.com') {
						replaceUnsupportedEmbed(node)
						return
					}
					node.properties = {
						...node.properties,
						src: source.toString(),
						title: node.properties.title || 'Bilibili video player',
						allow: 'autoplay; fullscreen; picture-in-picture',
						allowFullScreen: true,
						loading: 'lazy',
						referrerPolicy: 'no-referrer',
						sandbox: ['allow-scripts', 'allow-same-origin', 'allow-presentation'],
					}
				} catch {
					replaceUnsupportedEmbed(node)
				}
			} else if (node.tagName === 'video') {
				node.properties = {
					...node.properties,
					controls: true,
					preload: 'metadata',
				}
			}
		})
	}
}

// Style content links and mark images for progressive loading. This runs after
// sanitization, so only properties created here or explicitly allowed above
// can reach React.
function enhancePostHtml() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				const existing = node.properties?.className
				const classes = Array.isArray(existing)
					? existing.map(String)
					: existing != null
						? [String(existing)]
						: []
				node.properties = {
					...node.properties,
					className: [...classes, 'text-blue-600', 'hover:text-blue-800'],
					...(node.properties?.target === '_blank'
						? { rel: ['noopener', 'noreferrer'] }
						: {}),
				}
			} else if (node.tagName === 'img') {
				const width = Number(node.properties?.width)
				const height = Number(node.properties?.height)
				const source = node.properties?.src
				const hasIntrinsicDimensions =
					Number.isFinite(width) &&
					width > 0 &&
					Number.isFinite(height) &&
					height > 0
				const collectedDimensions =
					typeof source === 'string' ? knownImageDimensions[source] : undefined
				node.properties = {
					...node.properties,
					// Markdown image syntax has no dimension fields. A checked-in
					// content manifest supplies the real intrinsic ratio; explicit
					// dimensions in sanitized post HTML still take precedence.
					...(hasIntrinsicDimensions || !collectedDimensions
						? {}
						: collectedDimensions),
					loading: 'lazy',
					decoding: 'async',
				}
			} else if (/^h[1-6]$/.test(node.tagName)) {
				const existing = node.properties?.className
				node.properties = {
					...node.properties,
					className: [
						...(Array.isArray(existing) ? existing.map(String) : []),
						'scroll-mt-24',
					],
				}
			}
		})
	}
}

export function renderPostMarkdown(markdown: string): RenderedPost {
	const headings: ArticleHeading[] = []
	const remarkPlugins: PluggableList = [gfm, gemoji]
	const rehypePlugins: PluggableList = [
		rehypeRaw,
		[rehypeSanitize, postSchema],
		rehypeSlug,
		hardenEmbeds,
		enhancePostHtml,
		rehypeAutolinkHeadings,
		rehypePrism,
		collectHeadings(headings),
	]

	const content = Markdown({
		children: markdown,
		remarkPlugins,
		remarkRehypeOptions: { allowDangerousHtml: true },
		rehypePlugins,
	})

	return { content, headings }
}
