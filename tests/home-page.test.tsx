import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type { IssueEntry, IssueStats } from '@/lib/issues'
import en from '@/lib/dictionaries/en.json'
import zh from '@/lib/dictionaries/zh.json'
import { formatMonthYear } from '@/lib/formatDate'
import { getSiteDescription, getSiteTitle } from '@/lib/site-config'

// A fixed origin, so the structured data's URL is checked against a known
// value whatever NEXT_PUBLIC_SITE_URL the shell or CI sets.
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com')

afterAll(() => {
	vi.unstubAllEnvs()
})

// Flipped by the empty-state tests: the page then sees a locale with no posts,
// while every other export of lib/posts stays real.
const noPosts = vi.hoisted(() => ({ value: false }))

vi.mock('@/lib/posts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/lib/posts')>()
	return {
		...actual,
		getIssueIndex: (locale: 'zh' | 'en'): IssueEntry[] =>
			noPosts.value ? [] : actual.getIssueIndex(locale),
		getIssueStats: (locale: 'zh' | 'en'): IssueStats =>
			noPosts.value
				? { count: 0, first: null, last: null, firstDate: null, lastDate: null }
				: actual.getIssueStats(locale),
	}
})

vi.mock('@/components/Layout', () => ({
	default: ({ children }: { children: ReactNode }) => children,
}))

const { default: Home } = await import('@/app/[lang]/page')
const { getIssueIndex, getIssueStats } = await import('@/lib/posts')

const params = (lang: 'zh' | 'en') => ({ params: Promise.resolve({ lang }) })

async function render(lang: 'zh' | 'en') {
	return renderToStaticMarkup(await Home(params(lang)))
}

function escapeHtml(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function textOf(html: string) {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&#x27;/g, '\'')
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
}

const dicts = { zh, en } as const

const labels = {
	zh: { contents: '目录', issue: (n: number) => `第 ${n} 期：` },
	en: { contents: 'Contents', issue: (n: number) => `No. ${n}: ` },
} as const

afterEach(() => {
	noPosts.value = false
})

describe.each(['zh', 'en'] as const)('contents page (%s)', (lang) => {
	const issues = getIssueIndex(lang)
	const [lead, ...back] = issues

	it('describes the site as a WebSite in its own language', async () => {
		const html = await render(lang)
		const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]

		expect(blocks).toHaveLength(1)
		expect(JSON.parse(blocks[0][1])).toEqual({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: getSiteTitle('zh'),
			url: lang === 'zh' ? 'https://example.com/' : 'https://example.com/en',
			description: getSiteDescription(lang),
			inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
		})
	})

	it('has one h1, the contents heading', async () => {
		const html = await render(lang)
		const headings = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? []

		expect(headings).toHaveLength(1)
		expect(textOf(headings[0] ?? '')).toBe(labels[lang].contents)
	})

	it('leads with the newest issue, its number set as the numeral', async () => {
		const html = await render(lang)
		const article = html.match(/<article\b[\s\S]*?<\/article>/)?.[0] ?? ''
		const numeral = article.match(/<p aria-hidden="true" class="[^"]*font-display[^"]*">(\d+)<\/p>/)?.[1]

		expect(lead.issue).not.toBeNull()
		expect(numeral).toBe(String(lead.issue))
		expect(article).toContain(`href="${lead.href}"`)
		// The issue's own summary, whole: not the title repeated, not cut.
		expect(lead.excerpt).not.toBe(lead.displayTitle)
		expect(textOf(article)).toContain(lead.excerpt)
		expect(article).not.toContain('line-clamp')
	})

	it('shows every back issue\'s summary whole', async () => {
		const html = await render(lang)
		const index = html.match(/<section id="issues"[\s\S]*<\/section>/)?.[0] ?? ''

		for (const issue of back) {
			const line = new RegExp(`<p class="([^"]*)">${escapeRegExp(escapeHtml(issue.excerpt))}</p>`)
			const classes = index.match(line)?.[1]
			expect(classes).toBeDefined()
			// CSS truncation would print an ellipsis the summary does not have,
			// and hiding it would leave phones without it.
			expect(classes).not.toMatch(/\b(truncate|line-clamp-\d|hidden)\b/)
		}
	})

	it('serves the lead cover through the image optimizer', async () => {
		const html = await render(lang)
		const article = html.match(/<article\b[\s\S]*?<\/article>/)?.[0] ?? ''

		if (!lead.cover) {
			expect(article).not.toContain('<img')
			return
		}
		expect(article).toContain(`/_next/image?url=${encodeURIComponent(lead.cover.src)}`)
		expect(article).toContain('<figcaption')
	})

	it('prints no boilerplate summary', async () => {
		const text = textOf(await render(lang))

		expect(text).not.toContain('本期话题：')
		expect(text).not.toContain('This week\'s topic')
	})

	it('folds the archive in: every year is an anchor, exactly once', async () => {
		const html = await render(lang)
		const years = new Set(issues.map((issue) => issue.year))

		expect(html).toContain('id="issues"')
		expect(years.has(lead.year)).toBe(true)
		for (const year of years) {
			expect(html.match(new RegExp(`\\bid="${year}"`, 'g'))).toHaveLength(1)
		}
		expect(back.length).toBeGreaterThan(0)
		for (const issue of back) expect(years.has(issue.year)).toBe(true)
	})

	it('links no pagination or archive page', async () => {
		const html = await render(lang)

		expect(html).not.toMatch(/href="[^"]*\/page\//)
		expect(html).not.toMatch(/href="[^"]*\/archive/)
	})

	it('lists every back issue, its link named with the issue number first', async () => {
		const html = await render(lang)

		for (const issue of back) {
			expect(issue.issue).not.toBeNull()
			expect(html).toContain(
				`<span class="sr-only">${escapeHtml(labels[lang].issue(issue.issue!))}</span>${escapeHtml(issue.displayTitle)}</a>`,
			)
		}
		const rows = html.match(/<section id="issues"[\s\S]*<\/section>/)?.[0].match(/<li\b/g) ?? []
		expect(rows).toHaveLength(back.length)
	})

	it('says what the periodical is, when it was founded and how often it appears', async () => {
		const { firstDate } = getIssueStats(lang)
		const dict = dicts[lang].common
		const html = await render(lang)
		const masthead = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? ''

		expect(firstDate).not.toBeNull()
		expect(textOf(masthead)).toContain(dict.Standfirst)
		expect(textOf(masthead)).toContain(
			`${dict.FoundedIn.replace('{date}', formatMonthYear(firstDate!, lang))} · ${dict.Cadence}`,
		)
	})

	it('pads the masthead evenly, and the lead adds nothing above itself', async () => {
		const html = await render(lang)
		const masthead = html.match(/<header class="([^"]*)"/)?.[1].split(' ') ?? []
		const lead = html.match(/<article\b[^>]*class="([^"]*)"/)?.[1].split(' ') ?? []

		// The gap under the folio is the masthead's bottom padding, so it
		// matches the gap above the heading at every width.
		expect(masthead).toEqual(expect.arrayContaining(['py-8', 'lg:py-10']))
		expect(masthead.filter((name) => /^(?:\w+:)?p[tb]-/.test(name))).toEqual([])
		expect(lead.filter((name) => /^(?:\w+:)?(?:pt|py|p)-/.test(name))).toEqual([])
	})

	it('repeats nothing the header or the lead already shows', async () => {
		const html = await render(lang)
		const masthead = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? ''

		expect(masthead).not.toBe('')
		// No feed or About link: both are in the sticky header.
		expect(masthead).not.toContain('<a')
		// No run of issue numbers: the lead's numeral and the list show it.
		expect(textOf(masthead)).not.toMatch(/第 \d+–\d+ 期|Nos\. \d/)
		// The site description is the meta description, not printed here.
		expect(textOf(masthead)).not.toContain(getSiteDescription(lang))
	})

	it('says so when the locale has no posts, and points to the other one', async () => {
		noPosts.value = true
		const html = await render(lang)
		const other = lang === 'zh' ? 'en' : 'zh'

		expect(html.match(/<h1\b/g)).toHaveLength(1)
		expect(textOf(html)).toContain(
			lang === 'zh' ? '该语言暂无文章。' : 'No posts available in this language yet.',
		)
		const link = html.match(/<a\b[^>]*hreflang="[^"]*"[^>]*>/i)?.[0] ?? ''
		expect(link).toMatch(new RegExp(`hreflang="${other}"`, 'i'))
		expect(link).toContain(`lang="${other}"`)
		expect(link).toContain(`href="${other === 'en' ? '/en' : '/'}"`)
		expect(html).not.toContain('application/atom+xml')
		expect(html).not.toContain('<article')
		expect(html).not.toContain('id="issues"')
	})
})
