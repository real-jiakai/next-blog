import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PostData, PostMetadata } from '@/lib/posts'
import { getStaticPagePaths, isStaticPagePath } from '@/lib/static-paths'

const posts: Record<'zh' | 'en', PostMetadata[]> = {
	zh: [
		{ year: 2026, month: 1, slug: 'weekly-issue-23', filename: 'issue-23.md' },
		{ year: 2025, month: 1, slug: 'weekly-issue-22', filename: 'issue-22.md' },
		{ year: 2024, month: 9, slug: 'weekly-issue-21', filename: 'issue-21.md' },
	],
	// The newest issue is not translated yet.
	en: [
		{ year: 2025, month: 1, slug: 'weekly-issue-22', filename: 'issue-22.md' },
		{ year: 2024, month: 9, slug: 'weekly-issue-21', filename: 'issue-21.md' },
	],
}

vi.mock('@/lib/posts', () => ({
	getAllPostMetadata: (locale: 'zh' | 'en') => posts[locale],
	getSortedPostsData: (locale: 'zh' | 'en'): PostData[] =>
		posts[locale].map(({ slug }) => ({ slug, title: slug, date: '', summary: '' })),
}))

beforeAll(() => {
	// Two posts a page: Chinese reaches /page/2, English stays on one page.
	vi.stubEnv('NEXT_PUBLIC_POSTS_PERPAGE', '2')
})

afterAll(() => {
	vi.unstubAllEnvs()
})

describe('getStaticPagePaths', () => {
	it('lists every prerendered page under its public URL', () => {
		expect([...getStaticPagePaths()].sort()).toEqual(
			[
				'/',
				'/about',
				'/archive',
				'/page/2',
				'/2026/01/weekly-issue-23',
				'/2025/01/weekly-issue-22',
				'/2024/09/weekly-issue-21',
				'/en',
				'/en/about',
				'/en/archive',
				'/en/2025/01/weekly-issue-22',
				'/en/2024/09/weekly-issue-21',
			].sort(),
		)
	})
})

describe('isStaticPagePath', () => {
	it.each([
		'/',
		'/en',
		'/page/2',
		'/2024/09/weekly-issue-21',
		'/en/2024/09/weekly-issue-21',
		// The router decodes escapes before matching, so this names the same page.
		'/2024/09/weekly-issue-%32%31',
	])('knows %s', (pathname) => {
		expect(isStaticPagePath(pathname)).toBe(true)
	})

	it.each([
		'/zh',
		'/zh/about',
		'/page/1',
		'/page/3',
		'/en/page/2',
		'/en/2026/01/weekly-issue-23',
		'/2024/9/weekly-issue-21',
		'/2024/09/weekly-issue-21/',
		'/fr',
		'/en/missing',
		'/%E0%A4%A',
	])('does not know %s', (pathname) => {
		expect(isStaticPagePath(pathname)).toBe(false)
	})
})
