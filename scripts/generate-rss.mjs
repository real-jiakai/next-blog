// Generates the Atom feeds (public/index.xml, public/en/index.xml) at build
// time. The module is import-safe so feed behavior can be tested without
// writing to the repository.
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import nextEnv from '@next/env'
import matter from 'gray-matter'
import { Feed } from 'feed'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import gfm from 'remark-gfm'
import gemoji from 'remark-gemoji'
import remark2rehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrism from 'rehype-prism-plus'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'

const locales = ['zh', 'en']
const { loadEnvConfig } = nextEnv
const requiredEnvironment = [
	'NEXT_PUBLIC_SITE_URL',
	'NEXT_PUBLIC_SITE_TITLE',
	'NEXT_PUBLIC_SITE_DESCRIPTION',
]

const feedHtmlSchema = {
	...defaultSchema,
	tagNames: [
		...(defaultSchema.tagNames || []),
		'center',
		'figure',
		'figcaption',
		'iframe',
		'source',
		'video',
	],
	attributes: {
		...defaultSchema.attributes,
		'*': [...(defaultSchema.attributes?.['*'] || []), 'className'],
		a: [
			...(defaultSchema.attributes?.a || []),
			'target',
			'rel',
		],
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
			'loading',
			'referrerPolicy',
			'allow',
			'allowFullScreen',
			'frameBorder',
			'scrolling',
			'className',
			'sandbox',
		],
		video: [
			'src',
			'controls',
			'width',
			'height',
			'preload',
			'poster',
			'className',
			'ariaDescribedBy',
		],
		figure: ['className'],
		figcaption: ['className'],
		source: ['src', 'type', 'media'],
	},
	protocols: {
		...defaultSchema.protocols,
		src: ['http', 'https'],
	},
}

function replaceUnsupportedEmbed(node) {
	node.tagName = 'span'
	node.properties = { className: ['unsupported-embed'] }
	node.children = [{ type: 'text', value: '[Unsupported embed removed]' }]
}

function hardenFeedHtml() {
	return (tree) => {
		visit(tree, 'element', (node) => {
			if (node.tagName === 'iframe') {
				const rawSource = node.properties?.src
				if (typeof rawSource !== 'string') {
					replaceUnsupportedEmbed(node)
					return
				}

				try {
					const source = new URL(
						rawSource.startsWith('//') ? `https:${rawSource}` : rawSource,
					)
					if (
						source.protocol !== 'https:' ||
						source.hostname !== 'player.bilibili.com'
					) {
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
			} else if (
				node.tagName === 'a' &&
				node.properties?.target === '_blank'
			) {
				node.properties.rel = ['noopener', 'noreferrer']
			}
		})
	}
}

const processor = unified()
	.use(remarkParse)
	.use(gfm)
	.use(gemoji)
	.use(remark2rehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSanitize, feedHtmlSchema)
	.use(hardenFeedHtml)
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings)
	.use(rehypePrism)
	.use(rehypeStringify)

export function renderMarkdown(markdown) {
	return processor.processSync(markdown).toString()
}

export function readFeedConfig(environment = process.env) {
	const missing = requiredEnvironment.filter(
		(key) => typeof environment[key] !== 'string' || environment[key].trim() === '',
	)
	if (missing.length > 0) {
		throw new Error(
			`Missing required RSS environment variables: ${missing.join(', ')}`,
		)
	}

	let parsedSiteUrl
	try {
		parsedSiteUrl = new URL(environment.NEXT_PUBLIC_SITE_URL)
	} catch {
		throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute URL')
	}
	if (!['http:', 'https:'].includes(parsedSiteUrl.protocol)) {
		throw new Error('NEXT_PUBLIC_SITE_URL must use http or https')
	}

	return {
		siteUrl: environment.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ''),
		title: environment.NEXT_PUBLIC_SITE_TITLE,
		description: environment.NEXT_PUBLIC_SITE_DESCRIPTION,
		descriptions: {
			zh:
				environment.NEXT_PUBLIC_SITE_DESCRIPTION_ZH ||
				environment.NEXT_PUBLIC_SITE_DESCRIPTION,
			en:
				environment.NEXT_PUBLIC_SITE_DESCRIPTION_EN ||
				environment.NEXT_PUBLIC_SITE_DESCRIPTION,
		},
		copyright: environment.NEXT_PUBLIC_FOOTER || '',
	}
}

function parsePostDate(value, source) {
	const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`)
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid post date in ${source}`)
	}
	return date
}

export function getSortedPostsData(locale, postsBase) {
	const directory = path.join(postsBase, locale)
	if (!fs.existsSync(directory)) return []

	return fs
		.readdirSync(directory)
		.filter((filename) => filename.endsWith('.md'))
		.sort()
		.map((filename) => {
			const source = path.join(directory, filename)
			const { data, content } = matter(fs.readFileSync(source, 'utf8'))
			if (!data.title || !data.slug || !data.date) {
				throw new Error(`Missing title, slug, or date in ${source}`)
			}
			return {
				title: String(data.title),
				date: parsePostDate(data.date, source),
				slug: String(data.slug),
				draft: data.draft,
				contentMarkdown: content,
			}
		})
		.filter((post) => post.draft !== true)
		.sort((a, b) => b.date.getTime() - a.date.getTime())
}

// Feed readers show recent items, not an archive, and every entry carries the
// post's full rendered HTML — so the whole history makes the file grow without
// bound for no reader benefit. The site itself remains the complete archive.
export const MAX_FEED_ITEMS = 20

/** The newest posts a feed should carry. Input is already newest-first. */
export function selectFeedPosts(posts) {
	return posts.slice(0, MAX_FEED_ITEMS)
}

function newestPostDate(posts) {
	if (posts.length === 0) return new Date(0)
	return new Date(Math.max(...posts.map((post) => post.date.getTime())))
}

export function createAtomFeed(posts, locale, config) {
	if (!locales.includes(locale)) {
		throw new Error(`Unsupported RSS locale: ${locale}`)
	}

	const isEnglish = locale === 'en'
	const localePath = isEnglish ? '/en' : ''
	const homeUrl = `${config.siteUrl}${localePath}`
	const feedUrl = `${homeUrl}/index.xml`
	const feed = new Feed({
		title: config.title,
		description: config.descriptions?.[locale] || config.description,
		link: homeUrl,
		feed: feedUrl,
		language: locale,
		copyright: config.copyright,
		id: homeUrl,
		updated: newestPostDate(posts),
		author: {
			name: config.title,
			link: config.siteUrl,
		},
	})

	for (const post of posts) {
		const year = post.date.getUTCFullYear()
		const month = String(post.date.getUTCMonth() + 1).padStart(2, '0')
		const link = `${homeUrl}/${year}/${month}/${encodeURIComponent(post.slug)}`
		feed.addItem({
			id: link,
			title: post.title,
			content: renderMarkdown(post.contentMarkdown),
			link,
			date: post.date,
		})
	}

	const xslPath = isEnglish ? '/en/atom-style.xsl' : '/atom-style.xsl'
	return feed
		.atom1()
		.replace(
			/(<\?xml[^?]*\?>)/,
			`$1\n<?xml-stylesheet type="text/xsl" href="${xslPath}"?>\n`,
		)
}

export function writeFeed(posts, locale, config, publicDirectory) {
	const outputDirectory =
		locale === 'en' ? path.join(publicDirectory, 'en') : publicDirectory
	fs.mkdirSync(outputDirectory, { recursive: true })
	const outputPath = path.join(outputDirectory, 'index.xml')
	fs.writeFileSync(outputPath, createAtomFeed(posts, locale, config), 'utf8')
	console.log(`Generated ${outputPath} (${posts.length} items)`)
}

export function main(cwd = process.cwd()) {
	process.env.NODE_ENV ||= 'production'
	loadEnvConfig(cwd, process.env.NODE_ENV === 'development')
	const config = readFeedConfig()
	const postsBase = path.join(cwd, 'posts')
	const publicDirectory = path.join(cwd, 'public')

	for (const locale of locales) {
		writeFeed(
			selectFeedPosts(getSortedPostsData(locale, postsBase)),
			locale,
			config,
			publicDirectory,
		)
	}
}

const isMain =
	process.argv[1] &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMain) {
	try {
		main()
	} catch (error) {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	}
}
