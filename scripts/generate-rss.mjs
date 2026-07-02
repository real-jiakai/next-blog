// Generates the Atom feeds (public/index.xml, public/en/index.xml) at build
// time. Run as a `postbuild` step so feed generation is not a side effect of
// rendering a page module (which would write files during render and break on
// read-only filesystems).
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Feed } from 'feed'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import gfm from 'remark-gfm'
import remark2rehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrism from 'rehype-prism-plus'
import rehypeStringify from 'rehype-stringify'

// Load env vars so NEXT_PUBLIC_* resolve when this runs outside the Next
// runtime. Mirrors Next's precedence for the files this project uses:
// .env.local wins over .env, and neither overrides a value already in the
// process environment.
function loadEnv() {
	for (const file of ['.env.local', '.env']) {
		const fullPath = path.join(process.cwd(), file)
		if (!fs.existsSync(fullPath)) continue
		for (const line of fs.readFileSync(fullPath, 'utf8').split('\n')) {
			const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
			if (!match) continue
			const key = match[1]
			if (key in process.env) continue
			let value = (match[2] ?? '').trim()
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1)
			}
			process.env[key] = value
		}
	}
}

loadEnv()

const locales = ['zh', 'en']
const postsBase = path.join(process.cwd(), 'posts')

function getSortedPostsData(locale) {
	const dir = path.join(postsBase, locale)
	if (!fs.existsSync(dir)) return []

	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
		.map((file) => {
			const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'))
			return {
				title: data.title,
				date: data.date,
				slug: data.slug,
				draft: data.draft,
				contentMarkdown: content,
			}
		})
		.filter((post) => post.draft !== true)
		.sort((a, b) => (a.date < b.date ? 1 : -1))
}

const processor = unified()
	.use(remarkParse)
	.use(gfm)
	.use(remark2rehype, { allowDangerousHtml: true })
	.use(rehypeSlug)
	.use(rehypeAutolinkHeadings)
	.use(rehypePrism)
	.use(rehypeStringify)

function renderMarkdown(markdown) {
	return processor.processSync(markdown).toString()
}

function generateFeed(posts, locale) {
	const isEnglish = locale === 'en'
	const localePath = isEnglish ? '/en' : ''
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

	const feed = new Feed({
		title: process.env.NEXT_PUBLIC_SITE_TITLE,
		description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
		link: `${siteUrl}${localePath}`,
		language: locale,
		copyright: process.env.NEXT_PUBLIC_FOOTER ?? '',
		id: `${siteUrl}${localePath}`,
		author: {
			name: process.env.NEXT_PUBLIC_SITE_TITLE,
			link: siteUrl,
		},
	})

	for (const post of posts) {
		const date = new Date(post.date)
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		feed.addItem({
			title: post.title,
			content: renderMarkdown(post.contentMarkdown),
			link: `${siteUrl}${localePath}/${year}/${month}/${post.slug}`,
			date,
		})
	}

	const outputDir = isEnglish ? path.join('public', 'en') : 'public'
	fs.mkdirSync(outputDir, { recursive: true })

	const xslPath = isEnglish ? '/en/atom-style.xsl' : '/atom-style.xsl'
	const atomFeed = feed
		.atom1()
		.replace(
			/(<\?xml[^?]*\?>)/,
			`$1\n<?xml-stylesheet type="text/xsl" href="${xslPath}"?>\n`
		)

	fs.writeFileSync(path.join(outputDir, 'index.xml'), atomFeed)
	console.log(`Generated ${path.join(outputDir, 'index.xml')} (${posts.length} items)`)
}

for (const locale of locales) {
	generateFeed(getSortedPostsData(locale), locale)
}
