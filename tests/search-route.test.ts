import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from '@/app/api/search/route'
import { MARK_END, MARK_START } from '@/lib/search'
import type { SearchResponse } from '@/lib/search'

const { search, RequestError } = vi.hoisted(() => ({
	search: vi.fn(),
	RequestError: class extends Error {},
}))

vi.mock('meilisearch', () => ({
	Meilisearch: class {
		index() {
			return { search }
		}
	},
	MeilisearchRequestError: RequestError,
}))

const mark = (text: string) => `${MARK_START}${text}${MARK_END}`

const section = {
	id: 'post-1',
	title: 'Weekly #21',
	heading: 'Tools',
	anchor: 'tools',
	summary: 'The post summary.',
	date: '2024-09-01',
	url: '/2024/09/weekly-issue-21',
}

function get(query: string, init?: { signal: AbortSignal }) {
	return GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(query)}&lang=en`, init))
}

beforeEach(() => {
	vi.stubEnv('MEILISEARCH_HOST', 'http://search.test')
	vi.stubEnv('MEILISEARCH_SEARCH_KEY', 'search-key')
	search.mockReset()
})

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

describe('GET /api/search', () => {
	it('answers a query of only punctuation without searching', async () => {
		// Meilisearch would run it as a placeholder search and return any post.
		const response = await get('#')

		expect(search).not.toHaveBeenCalled()
		expect(((await response.json()) as SearchResponse).hits).toEqual([])
	})

	it('cuts a long query by code point, never through a surrogate pair', async () => {
		search.mockResolvedValue({ hits: [], processingTimeMs: 0 })

		await get(`${'a'.repeat(99)}😀tail`)

		expect(search.mock.calls[0][0]).toBe(`${'a'.repeat(99)}😀`)
	})

	it('shows the summary for a title-only match and the crop otherwise', async () => {
		search.mockResolvedValue({
			hits: [
				{ ...section, id: 'title', _formatted: { title: `Weekly ${mark('#21')}`, heading: 'Tools', content: 'Opening words…' } },
				{ ...section, id: 'content', _formatted: { title: 'Weekly #21', heading: 'Tools', content: `…a ${mark('match')} here…` } },
				{ ...section, id: 'heading', _formatted: { title: 'Weekly #21', heading: mark('Tools'), content: 'Section text…' } },
			],
			processingTimeMs: 1,
		})

		const { hits } = (await (await get('21')).json()) as SearchResponse

		expect(hits.map((hit) => hit.snippet)).toEqual([
			'The post summary.',
			`…a ${mark('match')} here…`,
			'Section text…',
		])
	})

	it('retries a transport failure once, within one deadline', async () => {
		search
			.mockRejectedValueOnce(new RequestError('reset'))
			.mockResolvedValueOnce({ hits: [], processingTimeMs: 0 })

		const response = await get('react')

		expect(response.status).toBe(200)
		expect(search).toHaveBeenCalledTimes(2)
		const [first, second] = search.mock.calls.map((call) => call[2].signal)
		expect(first).toBeInstanceOf(AbortSignal)
		expect(second).toBe(first)
	})

	it('does not retry or log once the reader has gone', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const controller = new AbortController()
		controller.abort()
		search.mockRejectedValue(new RequestError('aborted'))

		const response = await get('react', { signal: controller.signal })

		expect(response.status).toBe(502)
		expect(search).toHaveBeenCalledTimes(1)
		expect(error).not.toHaveBeenCalled()
	})

	it('does not retry an error Meilisearch itself returned', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		search.mockRejectedValue(new Error('index not found'))

		const response = await get('react')

		expect(response.status).toBe(502)
		expect(search).toHaveBeenCalledTimes(1)
	})
})
