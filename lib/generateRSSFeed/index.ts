import fs from 'fs'
import path from 'path'
import { Feed } from 'feed'
import { unified } from 'unified'
import gfm from 'remark-gfm'
import remark2rehype from 'remark-rehype'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import rehypeSlug from 'rehype-slug'
import rehypePrism from 'rehype-prism-plus'
import { Locale } from '@/lib/i18n-config'

export interface PostData {
  title: string
  date: string
  slug: string
  contentMarkdown: string
}

export default async function generateRSSFeed(
	allPostsData: PostData[],
	locale: Locale = 'zh'
): Promise<void> {
	const isEnglish = locale === 'en'
	const localePath = isEnglish ? '/en' : ''

	const feed = new Feed({
		title: process.env.NEXT_PUBLIC_SITE_TITLE!,
		description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION!,
		link: `${process.env.NEXT_PUBLIC_SITE_URL}${localePath}`,
		language: locale,
		copyright: process.env.NEXT_PUBLIC_FOOTER!,
		id: `${process.env.NEXT_PUBLIC_SITE_URL}${localePath}`,
		author: {
			name: process.env.NEXT_PUBLIC_SITE_TITLE!,
			link: process.env.NEXT_PUBLIC_SITE_URL!,
		},
	})

	allPostsData.forEach((post) => {
		const contentMarkdown = post.contentMarkdown

		const contentHtml = unified()
			.use(remarkParse)
			.use(gfm)
			.use(remark2rehype, { allowDangerousHtml: true })
			.use(rehypeSlug)
			.use(rehypeAutolinkHeadings)
			.use(rehypePrism)
			.use(rehypeStringify)
			.processSync(contentMarkdown)
			.toString()

		const date = new Date(post.date)
		const year = date.getFullYear()
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const slug = post.slug

		feed.addItem({
			title: post.title,
			content: contentHtml,
			link: `${process.env.NEXT_PUBLIC_SITE_URL}${localePath}/${year}/${month}/${slug}`,
			date: date,
		})
	})

	// Create directory if it doesn't exist
	const outputDir = isEnglish ? 'public/en' : 'public'
	if (isEnglish && !fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}

	// Generate Atom feed and add XSL stylesheet reference for beautiful styling
	let atomFeed = feed.atom1()
	const xslPath = isEnglish ? '/en/atom-style.xsl' : '/atom-style.xsl'
	const xslInstruction = `<?xml-stylesheet type="text/xsl" href="${xslPath}"?>\n`
	// Insert stylesheet instruction after the XML declaration
	atomFeed = atomFeed.replace(
		/(<\?xml[^?]*\?>)/,
		`$1\n${xslInstruction}`
	)

	fs.writeFileSync(path.join(outputDir, 'index.xml'), atomFeed)
}
