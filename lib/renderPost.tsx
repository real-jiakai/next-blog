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
import rehypePrism from 'rehype-prism-plus'
import { visit } from 'unist-util-visit'
import type { Element, Root, RootContent } from 'hast'
import type { ReactElement } from 'react'
import { i18n, type Locale } from './i18n-config'
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
			'autoPlay',
			'loop',
			'muted',
			'playsInline',
			'width',
			'height',
			'preload',
			'poster',
			'className',
			'ariaDescribedBy',
			'ariaLabel',
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

const clobberPrefix = postSchema.clobberPrefix || ''

// The visually hidden GFM footnote heading and each back-link's aria-label.
const footnoteLabels: Record<Locale, { heading: string; backToReference: string }> = {
	zh: { heading: '脚注', backToReference: '返回引用' },
	en: { heading: 'Footnotes', backToReference: 'Back to reference' },
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
				const className = node.properties?.className
				if (Array.isArray(className) && className.includes('sr-only')) return
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
					// An autoplaying clip stands in for a GIF: it may only play
					// silently and inline. Every other video is a player.
					...(node.properties.autoPlay
						? { muted: true, playsInline: true }
						: { controls: true }),
					preload: 'metadata',
				}
			}
		})
	}
}

// Point footnote links at their sanitized ids, keep new-tab links from
// reaching back to the page, and mark images for progressive loading. Links
// are styled by .article-content in globals.css, not by classes added here.
// This runs after sanitization, so only properties created here or explicitly
// allowed above can reach React.
function enhancePostHtml() {
	return (tree: Root) => {
		let isFirstImage = true
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				const href = node.properties?.href
				const isFootnoteLink =
					node.properties?.dataFootnoteRef != null ||
					node.properties?.dataFootnoteBackref != null
				node.properties = {
					...node.properties,
					// Sanitization prefixed the footnote ids, but not the links to them.
					...(isFootnoteLink && typeof href === 'string' && href.startsWith('#')
						? { href: `#${clobberPrefix}${href.slice(1)}` }
						: {}),
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
				const box = hasIntrinsicDimensions ? { width, height } : collectedDimensions
				node.properties = {
					...node.properties,
					// Markdown image syntax has no dimension fields. A checked-in
					// content manifest supplies the real intrinsic ratio; explicit
					// dimensions in sanitized post HTML still take precedence.
					...(hasIntrinsicDimensions || !collectedDimensions
						? {}
						: collectedDimensions),
					// The first image is usually the cover near the top of the page,
					// and so the likely LCP element; only later images wait.
					loading: isFirstImage ? 'eager' : 'lazy',
					decoding: 'async',
					...(isFirstImage ? { fetchPriority: 'high' } : {}),
					// globals.css skips rendering off-screen images and reserves a
					// generic 800×450 box for them; a known size reserves the real one.
					...(box
						? { style: `contain-intrinsic-size: auto ${box.width}px auto ${box.height}px` }
						: {}),
				}
				isFirstImage = false
			} else if (node.tagName === 'video' && node.properties?.autoPlay) {
				const existing = node.properties.className
				const width = Number(node.properties.width)
				const height = Number(node.properties.height)
				node.properties = {
					...node.properties,
					className: [
						...(Array.isArray(existing) ? existing.map(String) : []),
						'my-8',
						'max-w-full',
						'h-auto',
					],
					// Sized like the image it stands in for: no wider than its own
					// pixels and no taller than 70svh, with the box reserved before
					// the poster or first frame arrives.
					...(width > 0 && height > 0
						? {
							style: `aspect-ratio: ${width} / ${height}; width: min(${width}px, calc(70svh * ${width} / ${height}))`,
						}
						: {}),
				}
			} else if (/^h[1-6]$/.test(node.tagName)) {
				const existing = node.properties?.className
				node.properties = {
					...node.properties,
					className: [
						...(Array.isArray(existing) ? existing.map(String) : []),
						// Clear of the sticky header. An h2's box starts at its
						// rule, with 2rem of the previous section above it; 5rem
						// tucks that whole gap under the header, so a jump does
						// not leave the last line before it peeking out.
						node.tagName === 'h2' ? 'scroll-mt-20' : 'scroll-mt-24',
					],
				}
			}
		})
	}
}

export function renderPostMarkdown(
	markdown: string,
	locale: Locale = i18n.defaultLocale
): RenderedPost {
	const headings: ArticleHeading[] = []
	const labels = footnoteLabels[locale]
	const remarkPlugins: PluggableList = [gfm, gemoji]
	const rehypePlugins: PluggableList = [
		rehypeRaw,
		[rehypeSanitize, postSchema],
		rehypeSlug,
		hardenEmbeds,
		enhancePostHtml,
		[rehypePrism, { ignoreMissing: true }],
		collectHeadings(headings),
	]

	const content = Markdown({
		children: markdown,
		remarkPlugins,
		remarkRehypeOptions: {
			allowDangerousHtml: true,
			// Sanitization prefixes every id; a prefix here would be applied twice.
			clobberPrefix: '',
			footnoteLabel: labels.heading,
			footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
				`${labels.backToReference} ${referenceIndex + 1}${
					rereferenceIndex > 1 ? `-${rereferenceIndex}` : ''
				}`,
		},
		rehypePlugins,
	})

	return { content, headings }
}
