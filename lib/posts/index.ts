import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { cache } from 'react'
import { Locale, i18n } from '@/lib/i18n-config'

const postsBaseDirectory = path.join(process.cwd(), 'posts')
const postMetadataCache = new Map<Locale, PostMetadata[]>()

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

// 获取排序后的文章数据
export function getSortedPostsData(locale: Locale = i18n.defaultLocale): PostData[] {
	const postsDirectory = getPostsDirectory(locale)

	// If no posts for this locale, return empty array
	if (!fs.existsSync(postsDirectory)) {
		return []
	}

	const fileNames = fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
	let allPostsData: PostData[] = fileNames.map((fileName) => {
		const fullPath = path.join(postsDirectory, fileName)
		const fileContents = fs.readFileSync(fullPath, 'utf8')
		const matterResult = matter(fileContents)
		const data = matterResult.data as PostFrontmatter
		const date = data.date

		return {
			date,
			summary: data.summary,
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
	const cached = postMetadataCache.get(locale)
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

	postMetadataCache.set(locale, allPostMetadata)
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
