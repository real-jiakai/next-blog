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

const { default: Post } = await import('@/app/[lang]/[year]/[month]/[slug]/page')
const { default: PostHeader } = await import('@/components/PostHeader')
const { default: PostNav } = await import('@/components/PostNav')
const { getIssueIndex, getSortedPostsData } = await import('@/lib/posts')

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

	it('offers the post\'s source for editing', async () => {
		const html = await render(lang, newest)
		const link = linksOf(html).find((anchor) => anchor.includes('/edit/main/posts/')) ?? ''

		expect(link).toMatch(new RegExp(`/edit/main/posts/${lang}/[^"]+\\.md"`))
		expect(link).toContain('target="_blank"')
		expect(textOf(link)).toBe(`${dict.EditThisPage} ↗`)
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
