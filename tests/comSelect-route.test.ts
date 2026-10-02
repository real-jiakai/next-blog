import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { select, range } = vi.hoisted(() => ({
	select: vi.fn(),
	range: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/posts', () => ({
	getPostFilenameByParams: () => 'weekly-issue.md',
}))
vi.mock('@/lib/supabase', () => ({
	getSupabaseServerClient: () => {
		const query = {
			select: (columns: string) => {
				select(columns)
				return query
			},
			in: () => query,
			order: () => query,
			range,
		}
		return { from: () => query }
	},
}))

import { GET } from '@/app/api/comSelect/route'
import { getCommentAvatar } from '@/lib/commentAvatar'

const POST_URL = 'https://example.com/2026/07/weekly-issue'

// A full table row, as a careless `select('*')` would return it.
function storedComment(overrides: Record<string, unknown>) {
	return {
		id: 1,
		username: 'Alice',
		email: 'alice@example.com',
		email_verified_at: '2026-07-01T00:00:00Z',
		website: null,
		content: 'Hello',
		created_at: '2026-07-01T00:00:00Z',
		url: POST_URL,
		parent_comment_id: null,
		...overrides,
	}
}

function get() {
	return GET(
		new NextRequest('https://example.com/api/comSelect', {
			headers: { referer: POST_URL },
		})
	)
}

beforeEach(() => {
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com')
	vi.stubEnv('COMMENT_API_ENABLED', 'true')
	select.mockReset()
	range.mockReset()
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('GET /api/comSelect', () => {
	it('selects the website but never the email', async () => {
		range.mockResolvedValue({ data: [], error: null })

		expect((await get()).status).toBe(200)
		const columns = select.mock.calls[0][0].split(/,\s*/)
		expect(columns).toContain('website')
		expect(columns).not.toContain('email')
	})

	it('returns only public fields, with an avatar and a re-checked website', async () => {
		range.mockResolvedValue({
			data: [
				storedComment({
					id: 3,
					username: 'Mallory',
					website: 'javascript:alert(1)',
				}),
				storedComment({
					id: 2,
					username: 'Bob',
					website: 'https://bob.example',
				}),
				storedComment({ id: 1 }),
			],
			error: null,
		})

		const response = await get()
		const comments = await response.json()

		expect(response.headers.get('Cache-Control')).toBe('no-store')
		expect(comments.map((comment: { id: number }) => comment.id)).toEqual([1, 2, 3])
		for (const comment of comments) {
			expect(Object.keys(comment).sort()).toEqual([
				'avatar',
				'content',
				'created_at',
				'id',
				'parent_comment_id',
				'url',
				'username',
				'website',
			])
		}
		expect(comments[0]).toMatchObject({
			username: 'Alice',
			website: null,
			avatar: getCommentAvatar('Alice'),
		})
		expect(comments[0].content).toContain('<p>Hello</p>')
		expect(comments[1]).toMatchObject({
			username: 'Bob',
			website: 'https://bob.example/',
			avatar: getCommentAvatar('Bob'),
		})
		expect(comments[2].website).toBeNull()
	})
})
