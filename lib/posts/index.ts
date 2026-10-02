import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { Locale, i18n, getLocalePath } from '@/lib/i18n-config'
import {
	extractCoverImage,
	extractTopicExcerpt,
	isBoilerplateSummary,
	parseIssueTitle,
	truncateExcerpt,
} from '@/lib/issues'
import type { ImageDimensions, IssueEntry, IssueStats } from '@/lib/issues'
import postImageDimensions from '@/lib/post-image-dimensions.json'

const postsBaseDirectory = path.join(process.cwd(), 'posts')
const postMetadataCache = new Map<Locale, PostMetadata[]>()
const publishedPostsCache = new Map<Locale, PublishedPost[]>()
const issueIndexCache = new Map<Locale, IssueEntry[]>()
const imageDimensions: ImageDimensions = postImageDimensions

// Posts are not part of the module graph, so the dev server would keep
// serving a stale list after a post is added, redated or undrafted.
function cachingEnabled(): boolean {
	return process.env.NODE_ENV !== 'development'
}

// Get posts directory for a specific locale
function getPostsDirectory(locale: Locale): string {
	return path.join(postsBaseDirectory, locale)
}

function getPostYearMonth(date: string, filename: string) {
	const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(date)
	if (!match) {
		throw new Error(`Invalid post date in ${filename}: ${date}`)
	}
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const parsed = new Date(Date.UTC(year, month - 1, day))
	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() + 1 !== month ||
		parsed.getUTCDate() !== day
	) {
		throw new Error(`Invalid post date in ${filename}: ${date}`)
	}
	return { year, month }
}

export interface PostFrontmatter {
  title: string
  date: string
  slug: string
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
  date: string
  summary: string
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
  showtoc: boolean
  contentMarkdown: string
  audio: PostFrontmatter['audio'] | null
  title: string
  date: string
  summary: string
}

interface PublishedPost {
	fileName: string
	data: PostFrontmatter
	content: string
}

// Newest first; same-day posts fall back to the higher issue slug so the
// order (and the prev/next links built from it) never depends on readdir.
function compareNewestFirst(a: PostFrontmatter, b: PostFrontmatter): number {
	if (a.date !== b.date) {
		return a.date < b.date ? 1 : -1
	}
	return b.slug.localeCompare(a.slug, 'en', { numeric: true })
}

// Every non-draft post of a locale with its frontmatter and body, in the
// order the site lists them. The post list, the contents page and the
// prev/next links all read this, so they cannot disagree on the order.
function readPublishedPosts(locale: Locale): PublishedPost[] {
	const cached = cachingEnabled() ? publishedPostsCache.get(locale) : undefined
	if (cached) return cached

	const postsDirectory = getPostsDirectory(locale)

	// If no posts for this locale, return empty array
	if (!fs.existsSync(postsDirectory)) {
		return []
	}

	const fileNames = fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
	const posts = fileNames
		.map((fileName) => {
			const fullPath = path.join(postsDirectory, fileName)
			const fileContents = fs.readFileSync(fullPath, 'utf8')
			const matterResult = matter(fileContents)
			return {
				fileName,
				data: matterResult.data as PostFrontmatter,
				content: matterResult.content,
			}
		})
		.filter((post) => post.data.draft !== true)
		.sort((a, b) => compareNewestFirst(a.data, b.data))

	if (cachingEnabled()) publishedPostsCache.set(locale, posts)
	return posts
}

// 获取排序后的文章数据
export function getSortedPostsData(locale: Locale = i18n.defaultLocale): PostData[] {
	return readPublishedPosts(locale).map(({ data }) => ({
		date: data.date,
		summary: data.summary,
		slug: data.slug,
		title: data.title,
		draft: data.draft,
	}))
}

/**
 * The contents page's entries, newest first: the issue number split from the
 * title, an excerpt (a real frontmatter summary, else the opening of the
 * essay), the cover if its size is known, and the issue's song.
 */
export function getIssueIndex(locale: Locale = i18n.defaultLocale): IssueEntry[] {
	const cached = cachingEnabled() ? issueIndexCache.get(locale) : undefined
	if (cached) return cached

	const entries = readPublishedPosts(locale).map(({ fileName, data, content }) => {
		const { year, month } = getPostYearMonth(data.date, fileName)
		const { displayTitle, issue } = parseIssueTitle(data.title)
		const excerpt = isBoilerplateSummary(data.summary)
			? extractTopicExcerpt(content, locale) || displayTitle
			: truncateExcerpt(data.summary, locale)

		return {
			slug: data.slug,
			href: getLocalePath(locale, `/${year}/${String(month).padStart(2, '0')}/${data.slug}`),
			date: data.date,
			year,
			title: data.title,
			displayTitle,
			issue,
			excerpt,
			cover: extractCoverImage(content, imageDimensions, displayTitle),
			song: data.audio ? { name: data.audio.name, artist: data.audio.artist } : null,
		}
	})

	if (cachingEnabled()) issueIndexCache.set(locale, entries)
	return entries
}

/** How many issues a locale has, their number range and first and last dates. */
export function getIssueStats(locale: Locale = i18n.defaultLocale): IssueStats {
	const entries = getIssueIndex(locale)
	const numbers = entries.flatMap(({ issue }) => (issue === null ? [] : [issue]))
	return {
		count: entries.length,
		first: numbers.length > 0 ? Math.min(...numbers) : null,
		last: numbers.length > 0 ? Math.max(...numbers) : null,
		firstDate: entries.at(-1)?.date ?? null,
		lastDate: entries[0]?.date ?? null,
	}
}

// 获取所有文章的元数据
export function getAllPostMetadata(locale: Locale = i18n.defaultLocale): PostMetadata[] {
	const cached = cachingEnabled() ? postMetadataCache.get(locale) : undefined
	if (cached) return cached

	const postsDirectory = getPostsDirectory(locale)

	if (!fs.existsSync(postsDirectory)) {
		return []
	}

	const fileNames = fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
	const allPostMetadata = fileNames.flatMap((fileName) => {
		const fullPath = path.join(postsDirectory, fileName)
		const fileContents = fs.readFileSync(fullPath, 'utf8')
		const matterResult = matter(fileContents)
		const data = matterResult.data as PostFrontmatter
		if (data.draft === true) {
			return []
		}

		const { year, month } = getPostYearMonth(data.date, fileName)

		return [{
			year,
			month,
			slug: data.slug,
			filename: fileName,
		}]
	})

	if (cachingEnabled()) postMetadataCache.set(locale, allPostMetadata)
	return allPostMetadata
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
export const getPostDataByFileName = cache(async function getPostDataByFileName(
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
	const contentMarkdown = matterResult.content
	const showtoc = data.showtoc === undefined ? false : data.showtoc

	return {
		filename,
		showtoc,
		contentMarkdown,
		audio: data.audio || null,
		title: data.title,
		date: data.date,
		summary: data.summary,
	}
})
