import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let root: string

function writePost(
	filename: string,
	frontmatter: Record<string, string | boolean>,
	body = 'Body',
) {
	const lines = Object.entries(frontmatter).map(([key, value]) =>
		typeof value === 'string' ? `${key}: "${value}"` : `${key}: ${value}`
	)
	fs.writeFileSync(
		path.join(root, 'posts', 'zh', filename),
		`---\n${lines.join('\n')}\n---\n\n${body}\n`
	)
}

async function loadPosts() {
	vi.resetModules()
	return import('@/lib/posts')
}

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), 'posts-test-'))
	fs.mkdirSync(path.join(root, 'posts', 'zh'), { recursive: true })
	vi.spyOn(process, 'cwd').mockReturnValue(root)
})

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllEnvs()
	fs.rmSync(root, { recursive: true, force: true })
})

describe('getSortedPostsData', () => {
	// The directory order is forced both ways, since a filesystem may return
	// either and the old comparator only got one of them right.
	it.each([
		['a.md', 'b.md', 'c.md', 'd.md'],
		['b.md', 'a.md', 'c.md', 'd.md'],
	])('orders same-day posts by the higher issue slug, whatever the file order (%s %s)', async (...order) => {
		writePost('a.md', { title: 'Nine', date: '2024-01-01', slug: 'weekly-issue-9', summary: '' })
		writePost('b.md', { title: 'Ten', date: '2024-01-01', slug: 'weekly-issue-10', summary: '' })
		writePost('c.md', { title: 'Older', date: '2023-12-01', slug: 'weekly-issue-11', summary: '' })
		writePost('d.md', { title: 'Newer', date: '2024-02-01', slug: 'weekly-issue-08', summary: '' })
		vi.spyOn(fs, 'readdirSync').mockReturnValueOnce(order as never)

		const { getSortedPostsData } = await loadPosts()

		expect(getSortedPostsData('zh').map((post) => post.slug)).toEqual([
			'weekly-issue-08',
			'weekly-issue-10',
			'weekly-issue-9',
			'weekly-issue-11',
		])
	})
})

describe('getPostFilenameByParams', () => {
	it('sees posts added after the first lookup in development', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		writePost('one.md', { title: 'One', date: '2024-01-01', slug: 'one', summary: '' })
		const { getPostFilenameByParams } = await loadPosts()

		expect(getPostFilenameByParams('2024', '01', 'one', 'zh')).toBe('one.md')
		writePost('two.md', { title: 'Two', date: '2024-02-01', slug: 'two', summary: '', draft: true })
		expect(getPostFilenameByParams('2024', '02', 'two', 'zh')).toBeNull()
		writePost('two.md', { title: 'Two', date: '2024-02-01', slug: 'two', summary: '', draft: false })
		expect(getPostFilenameByParams('2024', '02', 'two', 'zh')).toBe('two.md')
	})

	it('keeps the cached metadata outside development', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		writePost('one.md', { title: 'One', date: '2024-01-01', slug: 'one', summary: '' })
		const { getPostFilenameByParams } = await loadPosts()

		expect(getPostFilenameByParams('2024', '01', 'one', 'zh')).toBe('one.md')
		writePost('two.md', { title: 'Two', date: '2024-02-01', slug: 'two', summary: '' })
		expect(getPostFilenameByParams('2024', '02', 'two', 'zh')).toBeNull()
	})
})

describe('the updated date', () => {
	it('carries a substantive revision\'s date, and nothing for a post never revised', async () => {
		writePost('a.md', { title: 'A', date: '2024-01-01', updated: '2024-03-02', slug: 'a', summary: '' })
		writePost('b.md', { title: 'B', date: '2024-02-01', slug: 'b', summary: '' })
		const { getSortedPostsData, getPostDataByFileName } = await loadPosts()

		const posts = getSortedPostsData('zh')
		expect(posts.find((post) => post.slug === 'a')).toHaveProperty('updated', '2024-03-02')
		expect(posts.find((post) => post.slug === 'b')).not.toHaveProperty('updated')
		expect((await getPostDataByFileName('2024', '01', 'a', 'zh'))?.updated).toBe('2024-03-02')
		expect((await getPostDataByFileName('2024', '02', 'b', 'zh'))?.updated).toBeNull()
	})

	it.each([
		['unquoted, which YAML reads as a Date', 'updated: 2024-03-02', /quote it/],
		['malformed', 'updated: "2024-13-02"', /Invalid post updated in bad\.md: 2024-13-02/],
		['before the post\'s own date', 'updated: "2023-12-31"', /2023-12-31 is before its date 2024-01-01/],
	])('fails the build when it is %s', async (_, line, message) => {
		fs.writeFileSync(
			path.join(root, 'posts', 'zh', 'bad.md'),
			`---\ntitle: "Bad"\ndate: "2024-01-01"\n${line}\nslug: "bad"\nsummary: ""\n---\n\nBody\n`,
		)
		const { getSortedPostsData, getAllPostMetadata } = await loadPosts()

		expect(() => getSortedPostsData('zh')).toThrow(message)
		expect(() => getAllPostMetadata('zh')).toThrow(message)
	})
})

describe('getIssueIndex', () => {
	const topic = '## 话题：标题\n\n这是话题下面的第一段正文，足够长，可以用作摘要。\n'

	it('lists published issues in the post list\'s order, drafts left out', async () => {
		writePost('a.md', { title: '九 #9', date: '2024-01-01', slug: 'weekly-issue-9', summary: '' }, topic)
		writePost('b.md', { title: '十 #10', date: '2024-01-01', slug: 'weekly-issue-10', summary: '' }, topic)
		writePost('c.md', { title: '十一 #11', date: '2025-02-01', slug: 'weekly-issue-11', summary: '', draft: true }, topic)
		writePost('d.md', { title: '八 #8', date: '2023-12-01', slug: 'weekly-issue-08', summary: '' }, topic)
		const { getIssueIndex, getIssueStats, getSortedPostsData } = await loadPosts()

		const index = getIssueIndex('zh')
		expect(index.map((issue) => issue.slug)).toEqual(
			getSortedPostsData('zh').map((post) => post.slug),
		)
		expect(index.map((issue) => issue.issue)).toEqual([10, 9, 8])
		expect(index[0]).toMatchObject({
			href: '/2024/01/weekly-issue-10',
			year: 2024,
			title: '十 #10',
			displayTitle: '十',
		})
		expect(getIssueStats('zh')).toEqual({
			count: 3,
			first: 8,
			last: 10,
			firstDate: '2023-12-01',
			lastDate: '2024-01-01',
		})
	})

	it('replaces a boilerplate summary with the essay\'s opening, and keeps a real one whole', async () => {
		// Longer than the 90 characters an excerpt is cut to: a summary
		// someone wrote is shown in full, never with an ellipsis.
		const written = `作者自己写的摘要，${'很长'.repeat(50)}。`
		writePost('a.md', { title: '一 #1', date: '2024-01-01', slug: 'one', summary: '本期话题：一' }, topic)
		writePost('b.md', { title: '二 #2', date: '2024-02-01', slug: 'two', summary: written }, topic)
		writePost('c.md', { title: '三 #3', date: '2024-03-01', slug: 'three', summary: '本期话题：三' }, '没有话题段落。')
		const { getIssueIndex } = await loadPosts()

		expect(getIssueIndex('zh').map((issue) => issue.excerpt)).toEqual([
			'三',
			written,
			'这是话题下面的第一段正文，足够长，可以用作摘要。',
		])
	})

	it('reads the song from the audio frontmatter and has none without it', async () => {
		writePost('a.md', { title: '一 #1', date: '2024-01-01', slug: 'one', summary: '' })
		fs.writeFileSync(
			path.join(root, 'posts', 'zh', 'b.md'),
			'---\ntitle: "二 #2"\ndate: "2024-02-01"\nslug: "two"\nsummary: ""\naudio:\n  name: "歌"\n  artist: "歌手"\n  url: "https://example.com/a.mp3"\n---\n\nBody\n',
		)
		const { getIssueIndex } = await loadPosts()

		expect(getIssueIndex('zh').map((issue) => issue.song)).toEqual([
			{ name: '歌', artist: '歌手' },
			null,
		])
	})

	it('is empty for a locale without posts', async () => {
		const { getIssueIndex, getIssueStats } = await loadPosts()

		expect(getIssueIndex('en')).toEqual([])
		expect(getIssueStats('en')).toEqual({
			count: 0,
			first: null,
			last: null,
			firstDate: null,
			lastDate: null,
		})
	})
})
