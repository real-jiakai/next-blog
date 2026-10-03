import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import zh from '@/lib/dictionaries/zh.json'
import en from '@/lib/dictionaries/en.json'
import { fillTemplate } from '@/lib/issues'
import type { IssueEntry } from '@/lib/issues'

vi.mock('@/components/Layout', () => ({
	default: ({ children }: { children: ReactNode }) => children,
}))

// next/dynamic with `ssr: false` bails out to the client by throwing during a
// server render; the player itself is the browser's business.
vi.mock('@/components/APlayer/DynamicAPlayer', () => ({
	default: ({ audio }: { audio: { name: string } }) => <div data-player={audio.name} />,
}))

// Lets a test give the post it renders a recorded revision, since no
// published issue has one to read.
const revision = vi.hoisted(() => ({ updated: null as string | null }))
vi.mock('@/lib/posts', async (importOriginal) => {
	const posts = await importOriginal<typeof import('@/lib/posts')>()
	return {
		...posts,
		getPostDataByFileName: async (...args: Parameters<typeof posts.getPostDataByFileName>) => {
			const post = await posts.getPostDataByFileName(...args)
			return post && revision.updated ? { ...post, updated: revision.updated } : post
		},
	}
})

const { default: Post, generateMetadata } = await import('@/app/[lang]/[year]/[month]/[slug]/page')
const { default: PostHeader } = await import('@/components/PostHeader')
const { default: PostNav } = await import('@/components/PostNav')
const { getIssueIndex, getPostDataByFileName, getSortedPostsData } = await import('@/lib/posts')
const { getSiteUrl } = await import('@/lib/site-config')

const dicts = { zh, en } as const

async function render(lang: 'zh' | 'en', entry: IssueEntry) {
	const params = {
		lang,
		year: entry.date.slice(0, 4),
		month: entry.date.slice(5, 7),
		slug: entry.slug,
	}
	return renderToStaticMarkup(await Post({ params: Promise.resolve(params) }))
}

function textOf(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&#x27;/g, '\'')
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const navOf = (html: string, label: string) =>
	html.match(new RegExp(`<nav aria-label="${escapeRegExp(label)}"[\\s\\S]*?</nav>`))?.[0] ?? ''

const linksOf = (html: string): string[] => html.match(/<a\b[\s\S]*?<\/a>/g) ?? []

describe.each(['zh', 'en'] as const)('post page (%s)', (lang) => {
	const dict = dicts[lang].common
	const issues = getIssueIndex(lang)
	const [newest, previous] = issues
	const issueN = (n: number) => fillTemplate(dict.IssueN, { n })

	it('orders the neighbours as the post list always has', () => {
		expect(issues.map((entry) => entry.slug)).toEqual(
			getSortedPostsData(lang).map((post) => post.slug),
		)
	})

	it('titles the issue without its number, which opens the heading unseen', async () => {
		const html = await render(lang, newest)
		const headings = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? []
		const heading = headings[0] ?? ''

		expect(newest.issue).not.toBeNull()
		expect(headings).toHaveLength(1)
		expect(textOf(heading)).toBe(
			`${fillTemplate(dict.IssueLabel, { n: newest.issue! })}${newest.displayTitle}`,
		)
		expect(heading).toContain(
			`<span class="sr-only">${fillTemplate(dict.IssueLabel, { n: newest.issue! })}</span>`,
		)
		expect(textOf(heading)).not.toContain('#')
	})

	it('sets the number in the kicker as a display-serif numeral', async () => {
		const html = await render(lang, newest)
		const [before, after] = dict.IssueN.split('{n}')

		expect(html).toMatch(
			new RegExp(
				`<span aria-hidden="true" class="[^"]*text-site-accent[^"]*">${escapeRegExp(before)}<span class="[^"]*font-display[^"]*">${newest.issue}</span>${escapeRegExp(after)}</span>`,
			),
		)
		const kicker = html.match(/<header\b[^>]*>\s*<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''
		expect(textOf(kicker)).toContain(dict.MinuteRead)
		expect(kicker).toContain(`<time dateTime="${newest.date}">`)
	})

	it('names the song above its player', async () => {
		const withSong = issues.find((entry) => entry.song)!
		const html = await render(lang, withSong)
		const [section = '', label = ''] =
			html.match(/<section aria-label="([^"]*)"[\s\S]*?<\/section>/) ?? []

		// The attribute is HTML-escaped (the en label has an apostrophe).
		expect(textOf(label)).toBe(dict.IssueBGM.replace(/[:：]\s*$/u, ''))
		expect(textOf(section)).toContain(dict.IssueBGM)
		expect(textOf(section)).toContain(`${withSong.song!.name} — ${withSong.song!.artist}`)
		expect(section).toContain(`data-player="${withSong.song!.name}"`)
	})

	it('links the newest issue back to the one before it, and to nothing newer', async () => {
		const nav = navOf(await render(lang, newest), dict.PostNavigation)
		const links = linksOf(nav)
		const link = links[0] ?? ''

		expect(links).toHaveLength(1)
		expect(link).toContain(`href="${previous.href}"`)
		expect(textOf(link)).toContain(`${dict.PreviousPost} · ${issueN(previous.issue!)}`)
		expect(textOf(link)).toContain(previous.displayTitle)
		expect(textOf(link)).not.toContain(`#${previous.issue}`)
	})

	it('links an issue in the middle both ways, in contents order', async () => {
		const nav = navOf(await render(lang, previous), dict.PostNavigation)
		const [older = '', newer = ''] = linksOf(nav)

		expect(older).toContain(`href="${issues[2].href}"`)
		expect(textOf(older)).toContain(`${dict.PreviousPost} · ${issueN(issues[2].issue!)}`)
		expect(newer).toContain(`href="${newest.href}"`)
		expect(textOf(newer)).toContain(`${dict.NextPost} · ${issueN(newest.issue!)}`)
		expect(newer).toContain('sm:col-start-2')
	})

	it('keeps the oldest issue\'s only link in the right-hand column', async () => {
		const links = linksOf(navOf(await render(lang, issues.at(-1)!), dict.PostNavigation))

		expect(links).toHaveLength(1)
		expect(links[0] ?? '').toContain(`href="${issues.at(-2)!.href}"`)
		expect(links[0] ?? '').toContain('sm:col-start-2')
	})

	it('lists the sections on a plain rail, with no position dot', async () => {
		const html = await render(lang, newest)
		const toc = navOf(html, dict.TOC)

		expect(toc).not.toBe('')
		expect(toc).toContain('<ul')
		expect(toc).toContain('href="#')
		expect(toc).toContain('border-l-2')
		// Nothing is current until the browser has measured the page.
		expect(toc).not.toContain('aria-current')
		expect(toc).not.toContain('rounded-full')
		expect(toc).not.toContain('#e8552d')
	})

	it('wears no blue anywhere', async () => {
		const html = await render(lang, newest)

		expect(html).not.toContain('text-blue')
		expect(html).not.toMatch(/\b(?:bg|border|outline|ring|decoration)-blue-/)
	})

	// Most issues open with a note on their song, which reads with the player
	// above it; the first department's rule closes the two together.
	it('closes the header with no rule of its own', async () => {
		const html = await render(lang, issues.find((entry) => entry.song)!)
		const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? ''

		expect(header).toContain('<section')
		expect(header).not.toMatch(/\bborder-/)
	})

	// The note follows the player at paragraph spacing; without a song the
	// body keeps the 2rem below the title that the player would have had.
	it('pads the header to what follows it', async () => {
		const withSong = await render(lang, issues.find((entry) => entry.song)!)
		const withoutSong = await render(lang, issues.find((entry) => !entry.song)!)
		const padding = (html: string) => html.match(/<header class="([^"]*)"/)?.[1]

		expect(padding(withSong)).toBe('pb-5')
		expect(padding(withoutSong)).toBe('pb-8')
	})

	// The newest issue's JSON-LD and meta tags, as the page renders them.
	async function describeNewest() {
		const params = {
			lang,
			year: newest.date.slice(0, 4),
			month: newest.date.slice(5, 7),
			slug: newest.slug,
		}
		const html = await render(lang, newest)
		const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
		const metadata = await generateMetadata({ params: Promise.resolve(params) })
		const post = await getPostDataByFileName(params.year, params.month, params.slug, lang)
		return {
			blocks,
			data: JSON.parse(blocks[0]?.[1] ?? '{}'),
			metadata,
			modifiedTime: (metadata.openGraph as { modifiedTime?: string } | undefined)?.modifiedTime,
			updated: post?.updated ?? undefined,
		}
	}

	it('describes the issue as a BlogPosting that matches its meta tags', async () => {
		const { blocks, data, metadata, modifiedTime, updated } = await describeNewest()
		const ogImage = [metadata.openGraph?.images].flat()[0] as { url: string } | undefined

		expect(blocks).toHaveLength(1)
		expect(data).toMatchObject({
			'@type': 'BlogPosting',
			headline: newest.title,
			description: metadata.description,
			url: metadata.alternates?.canonical,
			datePublished: newest.date,
			dateModified: updated ?? newest.date,
			inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
			author: { '@type': 'Person', name: 'Jiakai Gu' },
		})
		expect(ogImage).toBeDefined()
		expect(data.image).toEqual([new URL(ogImage!.url, `${getSiteUrl()}/`).href])
		// Only a recorded revision claims a modified time.
		expect(modifiedTime).toBe(updated)
	})

	it('dates a revised issue by its revision, in its meta tags and its JSON-LD alike', async () => {
		const updated = `${Number(newest.date.slice(0, 4)) + 1}-01-01`
		revision.updated = updated
		try {
			const { data, modifiedTime } = await describeNewest()

			expect(data).toMatchObject({ datePublished: newest.date, dateModified: updated })
			expect(modifiedTime).toBe(updated)
		} finally {
			revision.updated = null
		}
	})

	it('ends on its neighbours\' hairlines, with no ink rule above them and no edit link', async () => {
		const html = await render(lang, newest)

		expect(navOf(html, dict.PostNavigation)).toContain('border-site-line')
		expect(html).not.toContain('border-site-rule')
		expect(html).not.toContain('/edit/')
	})
})

describe('the first department of a post body', () => {
	const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')

	// With no rule under the post header, a body that opens with a department
	// keeps that department's rule; only its margin is trimmed.
	it('keeps its rule', () => {
		const rule = css.match(/\.article-content > h2:first-child\s*\{([^}]*)\}/)?.[1]

		expect(rule).toBeDefined()
		expect(rule).not.toMatch(/border|padding/)
	})
})

describe('post header and neighbours without issue numbers', () => {
	const entry = (overrides: Partial<IssueEntry>): IssueEntry => ({
		slug: 'note',
		href: '/2024/01/note',
		date: '2024-01-02',
		year: 2024,
		title: 'A note',
		displayTitle: 'A note',
		issue: null,
		excerpt: '',
		cover: null,
		song: null,
		...overrides,
	})

	it('opens the kicker with the date and the title with nothing hidden', () => {
		const html = renderToStaticMarkup(
			<PostHeader lang="zh" dict={zh} title="没有编号的一篇" date="2024-01-02" minutes={3} audio={null} />,
		)
		const kicker = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] ?? ''

		expect(textOf(kicker)).toBe('2024年1月2日·3 分钟阅读')
		expect(html).not.toContain('sr-only')
		expect(html).not.toContain('font-display')
		expect(html).not.toContain('<section')
		expect(textOf(html.match(/<h1\b[\s\S]*?<\/h1>/)?.[0] ?? '')).toBe('没有编号的一篇')
	})

	it('leaves the number out of a neighbour\'s label when it has none', () => {
		const html = renderToStaticMarkup(
			<PostNav dict={en} prev={entry({})} next={entry({ slug: 'later', href: '/2024/02/later' })} />,
		)

		expect(textOf(html)).toContain('← Previous issue')
		expect(textOf(html)).toContain('Next issue →')
		expect(textOf(html)).not.toContain('·')
	})

	it('renders no navigation when there is no neighbour', () => {
		expect(renderToStaticMarkup(<PostNav dict={zh} prev={null} next={null} />)).toBe('')
	})
})
