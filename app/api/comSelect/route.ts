import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { renderCommentHtml } from '@/lib/renderComment'

// Only expose columns the client actually renders. In particular, `email` and
// `website` are collected for notifications/moderation and must never be sent
// to the public.
const PUBLIC_COLUMNS = 'id, username, content, created_at, url, parent_comment_id'

// Derive the set of page URLs whose comments should be shown. A post exists in
// two locales (zh at `/...`, en at `/en/...`) and we want either page to show
// the same thread. Built by parsing the (untrusted) Referer into origin +
// pathname so no attacker-controlled text ever reaches the query filter.
function buildCandidateUrls(referer: string): string[] {
	let parsed: URL
	try {
		parsed = new URL(referer)
	} catch {
		return []
	}

	const { origin, pathname } = parsed
	const candidates = new Set<string>()
	candidates.add(`${origin}${pathname}`)

	// English variant
	if (pathname.startsWith('/en/')) {
		candidates.add(`${origin}${pathname.replace(/^\/en/, '')}`)
	} else {
		candidates.add(`${origin}/en${pathname}`)
	}

	// Chinese (default, no prefix) variant
	if (pathname.startsWith('/zh/')) {
		candidates.add(`${origin}${pathname.replace(/^\/zh/, '')}`)
	} else {
		candidates.add(`${origin}/zh${pathname}`)
	}

	return [...candidates]
}

async function fetchCommentsFromDB(referer: string) {
	const urls = buildCandidateUrls(referer)
	if (urls.length === 0) {
		return []
	}

	// `.in()` is parameterized by the client — values are encoded, not
	// concatenated into the filter string, so PostgREST filter injection via
	// the Referer header is not possible.
	const { data, error } = await supabase
		.from('comments')
		.select(PUBLIC_COLUMNS)
		.in('url', urls)
		.order('created_at', { ascending: true })

	if (error) {
		throw new Error(error.message)
	}

	return data
}

export async function GET(request: NextRequest) {
	try {
		const referer = request.headers.get('referer') || ''
		const comments = await fetchCommentsFromDB(referer)
		const rendered = await Promise.all(
			(comments || []).map(async (comment) => ({
				...comment,
				content: await renderCommentHtml(comment.content || ''),
			}))
		)
		return NextResponse.json(rendered)
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return NextResponse.json({ error: errorMessage }, { status: 500 })
	}
}
