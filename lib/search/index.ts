// Shared shapes for /api/search and the search UI.
//
// Meilisearch highlights matches by wrapping them in tags, which the UI would
// then have to render as raw HTML. Instead the route asks for two control
// characters as the highlight tags and the UI splits on them to build React
// nodes, so no text from a post is ever interpreted as markup. The indexer
// strips control characters from post text, so these markers cannot be forged
// by post content.
export const MARK_START = String.fromCharCode(1)
export const MARK_END = String.fromCharCode(2)

export interface SearchHit {
  id: string
  /** Path on this site, e.g. `/2024/09/weekly-issue-21` (already locale-aware). */
  url: string
  date: string
  /** Post title. May contain MARK_START/MARK_END around matched terms. */
  title: string
  /** Heading of the matched section, or null for a post's opening section. */
  heading: string | null
  /** Cropped excerpt around the match, or the post summary for an empty query. */
  snippet: string
}

export interface SearchResponse {
  query: string
  hits: SearchHit[]
  processingTimeMs: number
}

export interface HighlightRun {
  text: string
  match: boolean
}

/**
 * Split marked-up text into plain and highlighted runs, in order.
 *
 * Adjacent runs of the same kind are merged. Meilisearch marks every token it
 * matched, and its Chinese segmenter can split one word across tokens — a
 * match on 互联网 comes back as 互联 and 网 marked separately — so without
 * merging, a styled highlight would show a seam in the middle of a word.
 */
export function splitHighlights(text: string): HighlightRun[] {
	const runs: HighlightRun[] = []

	const push = (value: string, match: boolean) => {
		if (value === '') return

		const previous = runs.at(-1)
		if (previous && previous.match === match) {
			previous.text += value
		} else {
			runs.push({ text: value, match })
		}
	}

	let rest = text
	for (;;) {
		const start = rest.indexOf(MARK_START)
		if (start === -1) break

		const end = rest.indexOf(MARK_END, start + MARK_START.length)
		if (end === -1) break

		push(rest.slice(0, start), false)
		push(rest.slice(start + MARK_START.length, end), true)
		rest = rest.slice(end + MARK_END.length)
	}
	push(rest, false)

	return runs
}
