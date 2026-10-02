import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { Locale } from '@/lib/i18n-config'

// What the contents page knows about an issue. Everything here is derived
// from the post file at build time; nothing in it is written by hand.

export interface IssueCover {
	src: string
	alt: string
	width: number
	height: number
	// Aspect ratios for the cover box: the wide one is the desktop column's,
	// the narrow one the full-width phone box's (see coverShape).
	ratioWide: number
	ratioNarrow: number
	wide: boolean
}

export interface IssueSong {
	name: string
	artist: string
}

export interface IssueEntry {
	slug: string
	href: string
	date: string
	year: number
	// Frontmatter title verbatim ("… #23"): <title>, feeds and search keep it.
	title: string
	// The title without its trailing " #23"; the number is shown on its own.
	displayTitle: string
	issue: number | null
	excerpt: string
	cover: IssueCover | null
	song: IssueSong | null
}

export interface IssueStats {
	count: number
	first: number | null
	last: number | null
	firstDate: string | null
	lastDate: string | null
}

export type ImageDimensions = Record<string, { width: number; height: number }>

// The few mdast fields read below. @types/mdast is not a direct dependency,
// so the parsed tree is read through this structural view of it.
interface MdNode {
	type: string
	depth?: number
	value?: string
	url?: string
	alt?: string | null
	children?: MdNode[]
}

const markdownParser = unified().use(remarkParse).use(remarkGfm)

function parseMarkdown(markdown: string): MdNode[] {
	const tree: MdNode = markdownParser.parse(markdown)
	return tree.children ?? []
}

/** Splits "Title #23" into the title and its issue number. */
export function parseIssueTitle(title: string): { displayTitle: string; issue: number | null } {
	const match = /^(.*?)\s*#(\d+)\s*$/.exec(title)
	if (!match) return { displayTitle: title, issue: null }
	return { displayTitle: match[1], issue: Number(match[2]) }
}

/**
 * The issues' frontmatter summaries used to be just "本期话题：<title>", which
 * would print the title twice. Such a summary, or none, is replaced by an
 * excerpt.
 */
export function isBoilerplateSummary(summary: string | undefined | null): boolean {
	const value = (summary ?? '').trim()
	return value === '' || /^(本期话题|This (?:week|issue)'s topic)\s*[:：]/i.test(value)
}

// Text a reader would see: images, raw HTML (embeds, centred captions) and
// footnote markers drop out; a hard break reads as a space.
function plainText(node: MdNode): string {
	switch (node.type) {
	case 'text':
	case 'inlineCode':
		return node.value ?? ''
	case 'break':
		return ' '
	case 'paragraph':
	case 'heading':
	case 'link':
	case 'linkReference':
	case 'strong':
	case 'emphasis':
	case 'delete':
		return (node.children ?? []).map(plainText).join('')
	default:
		return ''
	}
}

const CJK = '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\u3000-\\u303f\\uff00-\\uffef]'
// A soft line break between two CJK characters is no word space; the
// lookarounds let three lines in a row all join.
const cjkLineBreak = new RegExp(`(?<=${CJK})[^\\S\\n]*\\n[^\\S\\n]*(?=${CJK})`, 'gu')

/** Collapses whitespace, dropping a line break between two CJK characters. */
export function normalizeWhitespace(text: string): string {
	return text.replace(cjkLineBreak, '').replace(/\s+/g, ' ').trim()
}

const ZH_EXCERPT_LENGTH = 90
const EN_EXCERPT_LENGTH = 200
const EN_EXCERPT_MIN_LENGTH = 150

/**
 * Shortens a fallback excerpt (an issue without a summary of its own) to the
 * length the contents page shows, by code point.
 */
export function truncateExcerpt(text: string, locale: Locale): string {
	const normalized = normalizeWhitespace(text)
	const characters = Array.from(normalized)
	const limit = locale === 'en' ? EN_EXCERPT_LENGTH : ZH_EXCERPT_LENGTH
	if (characters.length <= limit) return normalized

	let cut = characters.slice(0, limit).join('')
	if (locale === 'en') {
		// Back to the last word boundary, unless that would lose a quarter of it.
		const space = cut.lastIndexOf(' ')
		if (space >= EN_EXCERPT_MIN_LENGTH) cut = cut.slice(0, space)
	}
	// No dangling comma or colon in front of the ellipsis.
	return `${cut.replace(/[\s,;:，、；：]+$/u, '')}…`
}

// The h2 sections of a post, each with the nodes up to the next h2.
function sectionAfter(nodes: MdNode[], heading: RegExp): MdNode[] | null {
	const start = nodes.findIndex(
		(node) => node.type === 'heading' && node.depth === 2 && heading.test(plainText(node).trim()),
	)
	if (start === -1) return null
	const rest = nodes.slice(start + 1)
	const end = rest.findIndex((node) => node.type === 'heading' && node.depth === 2)
	return end === -1 ? rest : rest.slice(0, end)
}

const MIN_EXCERPT_LENGTH = 20

/**
 * The opening of the issue's essay: the first paragraph of real text under
 * its 话题 / Topic heading. That is not always the first h2 (some issues open
 * with a cover or a news item), and its first paragraph may be an embed, an
 * image, a caption or a wholly italic or bold line standing in for a
 * subheading (*什么是同质化？*), which are skipped. '' when there is none.
 */
export function extractTopicExcerpt(markdown: string, locale: Locale): string {
	const section = sectionAfter(parseMarkdown(markdown), /^(话题|Topic\b)/)
	if (!section) return ''
	for (const node of section) {
		if (node.type !== 'paragraph') continue
		const [only, ...rest] = node.children ?? []
		if (rest.length === 0 && (only?.type === 'emphasis' || only?.type === 'strong')) continue
		const text = normalizeWhitespace(plainText(node))
		if (Array.from(text).length >= MIN_EXCERPT_LENGTH) {
			return truncateExcerpt(text, locale)
		}
	}
	return ''
}

function firstImage(nodes: MdNode[]): MdNode | null {
	for (const node of nodes) {
		if (node.type === 'image') return node
		const found = firstImage(node.children ?? [])
		if (found) return found
	}
	return null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Box proportions for a cover of width × height. The desktop column allows a
 * slightly tall box (down to 4:5) and the full-width phone box none taller
 * than square; both stop at 3:2, so a panorama is cropped, not shrunk to a
 * strip. Wider than 1.15 gets the wider desktop column.
 */
export function coverShape(width: number, height: number): Pick<IssueCover, 'ratioWide' | 'ratioNarrow' | 'wide'> {
	const ratio = width / height
	return {
		ratioWide: clamp(ratio, 0.8, 1.5),
		ratioNarrow: clamp(ratio, 1, 1.5),
		wide: ratio > 1.15,
	}
}

/**
 * The first image under the post's 封面图 / Cover Image heading. Only an image
 * whose size is in the dimensions manifest is used, so the box can be laid
 * out before it loads; anything else means no cover.
 */
export function extractCoverImage(
	markdown: string,
	dimensions: ImageDimensions,
	fallbackAlt: string,
): IssueCover | null {
	const section = sectionAfter(parseMarkdown(markdown), /^(封面图|Cover Image)/)
	const image = section ? firstImage(section) : null
	const size = image?.url ? dimensions[image.url] : undefined
	if (!image?.url || !size) return null
	return {
		src: image.url,
		alt: image.alt?.trim() || fallbackAlt,
		width: size.width,
		height: size.height,
		...coverShape(size.width, size.height),
	}
}

/**
 * Entries grouped by year. Years and the entries within them keep their input
 * order, so newest-first entries give newest-first years; each year appears
 * once (it becomes an element id).
 */
export function groupByYear<T extends { year: number }>(entries: T[]): { year: number; entries: T[] }[] {
	const groups = new Map<number, T[]>()
	for (const entry of entries) {
		const group = groups.get(entry.year)
		if (group) {
			group.push(entry)
		} else {
			groups.set(entry.year, [entry])
		}
	}
	return [...groups].map(([year, grouped]) => ({ year, entries: grouped }))
}

/**
 * The run of issue numbers ("第 1–23 期"), or a single "第 1 期" while the run
 * has only one number; null when no issue carries a number.
 */
export function formatIssueRange(
	templates: { IssueN: string, IssueRange: string },
	{ first, last }: Pick<IssueStats, 'first' | 'last'>,
): string | null {
	if (first === null || last === null) return null
	return first === last
		? fillTemplate(templates.IssueN, { n: first })
		: fillTemplate(templates.IssueRange, { first, last })
}

/** Fills `{name}` slots in a dictionary string. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (slot, name: string) =>
		name in values ? String(values[name]) : slot,
	)
}
