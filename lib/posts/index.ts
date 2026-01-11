import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import gfm from 'remark-gfm'
import remark2rehype from 'remark-rehype'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import rehypeSlug from 'rehype-slug'
import rehypePrism from 'rehype-prism-plus'
import rehypeRaw from 'rehype-raw'
import addClasses from 'rehype-add-classes'
import { Locale, i18n } from '@/lib/i18n-config'

const postsBaseDirectory = path.join(process.cwd(), 'posts')

// Get posts directory for a specific locale
function getPostsDirectory(locale: Locale): string {
	return path.join(postsBaseDirectory, locale)
}

export interface PostFrontmatter {
  title: string
  date: string
  slug: string
  tags: string[]
  summary: string
  draft?: boolean
  showtoc?: boolean
  audio?: {
    name: string
    artist: string
    url: string
    cover?: string
    lrc?: string
  }
}

export interface PostData {
  id: string
  date: string
  tags: string[]
  summary: string
  contentMarkdown: string
  slug: string
  title: string
  draft?: boolean
}

export interface PostMetadata {
  year: number
  month: number
  slug: string
  filename: string
}

export interface PostContent {
  filename: string
  year: string
  month: string
  tags: string[]
  slug: string
  showtoc: boolean
  contentHtml: string
  contentMarkdown: string
  audio: PostFrontmatter['audio'] | null
  title: string
  date: string
}

export interface PostListItem {
  title: string
  year: number
  month: string
  slug: string
  date: string
  summary: string
  tags?: string[]
}

// 获取排序后的文章数据
export function getSortedPostsData(locale: Locale = i18n.defaultLocale): PostData[] {
	const postsDirectory = getPostsDirectory(locale)

	// If no posts for this locale, return empty array
	if (!fs.existsSync(postsDirectory)) {
		return []
	}

	const fileNames = fs.readdirSync(postsDirectory).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
	let allPostsData: PostData[] = fileNames.map((fileName) => {
		const id = fileName.replace(/\.mdx?$/, '')
		const fullPath = path.join(postsDirectory, fileName)
		const fileContents = fs.readFileSync(fullPath, 'utf8')
		const matterResult = matter(fileContents)
		const data = matterResult.data as PostFrontmatter
		const date = data.date

		return {
			id,
			date,
			tags: data.tags,
			summary: data.summary,
			contentMarkdown: matterResult.content,
			slug: data.slug,
			title: data.title,
			draft: data.draft,
		}
	})

	allPostsData = allPostsData.filter((post) => post.draft !== true)

	return allPostsData.sort((a, b) => {
		if (a.date < b.date) {
			return 1
		} else {
			return -1
		}
	})
}

// 获取所有文章的元数据
export function getAllPostMetadata(locale: Locale = i18n.defaultLocale): PostMetadata[] {
	const postsDirectory = getPostsDirectory(locale)

	if (!fs.existsSync(postsDirectory)) {
		return []
	}

	const fileNames = fs.readdirSync(postsDirectory).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
	const allPostMetadata = fileNames.map((fileName) => {
		const fullPath = path.join(postsDirectory, fileName)
		const fileContents = fs.readFileSync(fullPath, 'utf8')
		const matterResult = matter(fileContents)
		const data = matterResult.data as PostFrontmatter

		const date = new Date(data.date)
		const year = date.getFullYear()
		const month = date.getMonth() + 1

		return {
			year,
			month,
			slug: data.slug,
			filename: fileName,
		}
	})

	return allPostMetadata
}

// 获取所有语言的所有文章元数据（用于生成静态路径）
export function getAllPostMetadataAllLocales(): (PostMetadata & { locale: Locale })[] {
	const allMetadata: (PostMetadata & { locale: Locale })[] = []

	for (const locale of i18n.locales) {
		const metadata = getAllPostMetadata(locale)
		for (const post of metadata) {
			allMetadata.push({ ...post, locale })
		}
	}

	return allMetadata
}

// 根据参数获取文件名
export function getPostFilenameByParams(
	year: string,
	month: string,
	slug: string,
	locale: Locale = i18n.defaultLocale
): string | null {
	const allPostMetadata = getAllPostMetadata(locale)

	const matchingPost = allPostMetadata.find(
		(post) =>
			post.year.toString() === year &&
      post.month.toString().padStart(2, '0') === month &&
      post.slug === slug
	)

	if (matchingPost) {
		return matchingPost.filename
	}

	return null
}

// 根据文件名获取文章数据
export async function getPostDataByFileName(
	year: string,
	month: string,
	slug: string,
	locale: Locale = i18n.defaultLocale
): Promise<PostContent | null> {
	const filename = getPostFilenameByParams(year, month, slug, locale)
	if (!filename) {
		return null
	}
	const postsDirectory = getPostsDirectory(locale)
	const fullPath = path.join(postsDirectory, filename)
	const fileContents = fs.readFileSync(fullPath, 'utf8')

	const matterResult = matter(fileContents)
	const data = matterResult.data as PostFrontmatter
	const contentMarkdown = matterResult.content.replace(
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		''
	)
	const tags = data.tags
	const showtoc = data.showtoc === undefined ? false : data.showtoc

	// 使用 remark 和 rehype 处理内容
	const contentHtml = await unified()
		.use(remarkParse)
		.use(gfm)
		.use(remark2rehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(addClasses, {
			a: 'text-blue-600 hover:text-blue-800',
			div: 'bg-white text-black dark:bg-gray-600 dark:text-gray-100',
			span: 'white',
		})
		.use(rehypeStringify)
		.use(rehypePrism)
		.use(rehypeSlug)
		.use(rehypeAutolinkHeadings)
		.process(matterResult.content)
		.then((processedContent) => processedContent.toString())

	return {
		filename,
		year,
		month,
		tags,
		slug,
		showtoc,
		contentHtml,
		contentMarkdown,
		audio: data.audio || null,
		title: data.title,
		date: data.date,
	}
}

// 获取所有标签
export function getAllTags(locale: Locale = i18n.defaultLocale): string[] {
	const allPostsData = getSortedPostsData(locale)
	const tags = allPostsData.reduce<string[]>((acc, cur) => {
		cur.tags.forEach((tag) => {
			if (!acc.includes(tag)) {
				acc.push(tag)
			}
		})
		return acc
	}, [])
	return tags
}

// 获取所有语言的所有标签（用于生成静态路径）
export function getAllTagsAllLocales(): { tag: string; locale: Locale }[] {
	const allTags: { tag: string; locale: Locale }[] = []

	for (const locale of i18n.locales) {
		const tags = getAllTags(locale)
		for (const tag of tags) {
			// Avoid duplicates
			if (!allTags.some(t => t.tag === tag && t.locale === locale)) {
				allTags.push({ tag, locale })
			}
		}
	}

	return allTags
}

// 根据标签获取数据
export function getPostsListByTag(tag: string, locale: Locale = i18n.defaultLocale): PostListItem[] {
	const allPostsData = getSortedPostsData(locale)
	const filteredPosts = allPostsData.filter((post) => post.tags.includes(tag))
	return filteredPosts.map((post) => {
		const { title, slug, date, summary, tags } = post
		const year = new Date(date).getFullYear()
		const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0')

		return {
			title,
			year,
			month,
			slug,
			date,
			summary,
			tags,
		}
	})
}
