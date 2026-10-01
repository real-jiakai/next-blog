import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let root: string

function writePost(filename: string, frontmatter: Record<string, string | boolean>) {
	const lines = Object.entries(frontmatter).map(([key, value]) =>
		typeof value === 'string' ? `${key}: "${value}"` : `${key}: ${value}`
	)
	fs.writeFileSync(
		path.join(root, 'posts', 'zh', filename),
		`---\n${lines.join('\n')}\n---\n\nBody\n`
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
	it('orders same-day posts by the higher issue slug, whatever the file order', async () => {
		writePost('a.md', { title: 'Nine', date: '2024-01-01', slug: 'weekly-issue-9', summary: '' })
		writePost('b.md', { title: 'Ten', date: '2024-01-01', slug: 'weekly-issue-10', summary: '' })
		writePost('c.md', { title: 'Older', date: '2023-12-01', slug: 'weekly-issue-11', summary: '' })
		writePost('d.md', { title: 'Newer', date: '2024-02-01', slug: 'weekly-issue-08', summary: '' })

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
