import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostData } from '@/lib/posts'

const posts = vi.hoisted(() => ({
	zh: [] as PostData[],
	en: [] as PostData[],
}))

vi.mock('@/lib/posts', () => ({
	getSortedPostsData: (locale: 'zh' | 'en') => posts[locale],
}))

// The sitemap reads its base URL once, when the module loads.
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com')
const { default: sitemap } = await import('@/app/sitemap')
const { isPageInEveryLocale } = await import('@/lib/pagination')

function post(slug: string, date: string): PostData {
	return { slug, date, title: slug, summary: '', draft: false }
}

beforeEach(() => {
	vi.stubEnv('NEXT_PUBLIC_POSTS_PERPAGE', '1')
	// The English translation of `c` is still a draft, so it is not listed.
	posts.zh = [post('c', '2026-03-01'), post('b', '2026-02-01'), post('a', '2026-01-01')]
	posts.en = [post('b', '2026-02-01'), post('a', '2026-01-01')]
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('sitemap', () => {
	it('names in hreflang only URLs the sitemap itself lists', () => {
		const entries = sitemap()
		const urls = new Set(entries.map((entry) => entry.url))
		const alternates = entries.flatMap((entry) =>
			Object.values(entry.alternates?.languages ?? {}),
		)

		expect(alternates.length).toBeGreaterThan(0)
		for (const href of alternates) {
			expect(urls).toContain(href)
		}
	})

	it('gives an untranslated post and an unmatched page number no alternates', () => {
		const entries = sitemap()
		const byUrl = new Map(entries.map((entry) => [entry.url, entry]))

		// toHaveProperty also fails if the entry itself went missing.
		expect(byUrl.get('https://example.com/2026/03/c')).toHaveProperty('alternates', undefined)
		expect(byUrl.get('https://example.com/page/3')).toHaveProperty('alternates', undefined)
		expect(byUrl.get('https://example.com/2026/02/b')?.alternates?.languages).toEqual({
			zh: 'https://example.com/2026/02/b',
			en: 'https://example.com/en/2026/02/b',
			'x-default': 'https://example.com/2026/02/b',
		})
	})
})

describe('isPageInEveryLocale', () => {
	it('holds only up to the shorter locale\'s last page', () => {
		expect(isPageInEveryLocale(2)).toBe(true)
		expect(isPageInEveryLocale(3)).toBe(false)
	})
})
