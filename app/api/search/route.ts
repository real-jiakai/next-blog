import { NextRequest, NextResponse } from 'next/server'
import { Meilisearch, MeilisearchRequestError } from 'meilisearch'

import { i18n } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { MARK_START, MARK_END, MAX_QUERY_LENGTH, hasSearchableText } from '@/lib/search'
import type { SearchHit, SearchResponse } from '@/lib/search'

// The browser never talks to Meilisearch; it calls this route, which holds the
// key server-side. That keeps the site's Content-Security-Policy at
// `connect-src 'self'`, needs no CORS setup on the search host, and works even
// when Meilisearch only listens on its host's loopback interface.

export const runtime = 'nodejs'

const MAX_RESULTS = 8
// A result that takes longer than this is of no use to a type-ahead UI, and
// the bound keeps a hung socket from holding the route open. It covers the
// retry as well, so a slow host is not waited on twice.
const REQUEST_TIMEOUT_MS = 5000

// `content` is deliberately absent: Meilisearch still returns the cropped,
// highlighted `_formatted.content` for a field that is not retrieved, so the
// snippet arrives without shipping every matched section's full body.
const RETRIEVED = ['id', 'title', 'heading', 'anchor', 'summary', 'date', 'url']

interface PostSection {
  id: string
  title: string
  heading: string | null
  anchor: string | null
  summary: string
  date: string
  url: string
  content: string
}

// The indexes are built and owned by the sync job on the search VPS, not by
// this repository. This must match the uid that job writes to.
function searchIndexUid(locale: Locale): string {
	return `${process.env.MEILISEARCH_INDEX_PREFIX || 'next-blog-posts'}-${locale}`
}

let client: Meilisearch | undefined

function getClient(): Meilisearch | null {
	const host = process.env.MEILISEARCH_HOST
	// A search-only key: it can query these indexes and do nothing else.
	const apiKey = process.env.MEILISEARCH_SEARCH_KEY
	if (!host || !apiKey) return null
	if (!client) {
		// No `timeout` here: the client ignores it for a request that carries
		// its own signal, and every search does.
		client = new Meilisearch({
			host,
			apiKey,
			// Identifies this app's traffic in the search host's logs.
			clientAgents: ['next-blog'],
		})
	}
	return client
}

/**
 * Searching is one cross-network call per keystroke, so a transient TLS reset
 * on the way to the search host would otherwise surface to the reader as
 * "search unavailable". Retry once, and only for a transport failure — an
 * error Meilisearch itself returned would just fail again identically. Nor is
 * an aborted `signal` worth a retry: the deadline has passed, or the reader
 * has typed on and the dialog dropped this request.
 */
async function withRetry<T>(signal: AbortSignal, run: () => Promise<T>): Promise<T> {
	try {
		return await run()
	} catch (error) {
		if (!(error instanceof MeilisearchRequestError) || signal.aborted) throw error
		return run()
	}
}

function parseLocale(value: string | null): Locale {
	return (i18n.locales as readonly string[]).includes(value ?? '')
		? (value as Locale)
		: i18n.defaultLocale
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	// Cut by code point: a cut through an emoji's surrogate pair would leave
	// half of it, which Meilisearch rejects as invalid JSON.
	const query = Array.from(searchParams.get('q') ?? '').slice(0, MAX_QUERY_LENGTH).join('').trim()
	const lang = parseLocale(searchParams.get('lang'))

	const meilisearch = getClient()
	if (!meilisearch) {
		return NextResponse.json({ error: 'Search is not configured.' }, { status: 503 })
	}

	// The dialog shows a prompt until something is typed, so an empty query has
	// nothing to answer and should not cost a round trip to the search host.
	// Nor should one of only punctuation, such as '#': Meilisearch would run it
	// as a placeholder search and return posts nobody asked for.
	if (!hasSearchableText(query)) {
		return NextResponse.json({ query, hits: [], processingTimeMs: 0 } satisfies SearchResponse)
	}

	try {
		const index = meilisearch.index<PostSection>(searchIndexUid(lang))
		// One deadline for both attempts, ended early if the reader has gone.
		const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])

		const result = await withRetry(signal, () =>
			index.search(
				query,
				{
					limit: MAX_RESULTS,
					attributesToRetrieve: RETRIEVED,
					attributesToHighlight: ['title', 'heading', 'content'],
					attributesToCrop: ['content'],
					cropLength: 40,
					cropMarker: '…',
					highlightPreTag: MARK_START,
					highlightPostTag: MARK_END,
				},
				{ signal },
			),
		)

		const hits: SearchHit[] = result.hits.map((hit) => {
			const formatted = hit._formatted
			const crop = formatted?.content ?? ''
			const summary = hit.summary ?? ''
			const sectionMatched =
				crop.includes(MARK_START) || Boolean(formatted?.heading?.includes(MARK_START))

			return {
				id: hit.id,
				// A section with no anchor is the post's opening text; link to the
				// top of the post instead of to a heading that is not there.
				url: hit.anchor ? `${hit.url}#${encodeURIComponent(hit.anchor)}` : hit.url,
				date: hit.date,
				title: formatted?.title ?? hit.title,
				heading: formatted?.heading ?? hit.heading ?? null,
				// A section that matched keeps its crop. A hit that matched only on
				// its title still gets a crop, but an unmarked one from the start of
				// the section, so the post's summary stands in for it.
				snippet: sectionMatched ? crop || summary : summary || crop,
			}
		})

		// No total is returned: `estimatedTotalHits` is estimated before
		// `distinctAttribute` collapses a post's sections, so it overcounts here.
		// A real total would need the `hitsPerPage`/`page` form of the search API.
		const body: SearchResponse = {
			query,
			hits,
			processingTimeMs: result.processingTimeMs,
		}

		return NextResponse.json(body)
	} catch (error: unknown) {
		// Log the detail, but keep the host and index names out of the response.
		// A request the reader abandoned by typing on is routine, not a failure.
		if (!request.signal.aborted) console.error('search failed:', error)
		return NextResponse.json({ error: 'Search is unavailable.' }, { status: 502 })
	}
}
