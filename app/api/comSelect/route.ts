import { NextRequest, NextResponse } from 'next/server'

import {
	CommentRequestError,
	CommentServiceUnavailableError,
	FixedWindowRateLimiter,
	getClientIp,
	mapWithConcurrency,
	parseCommentPagination,
	resolveCommentThread,
} from '@/lib/commentSecurity'
import { renderCommentHtml } from '@/lib/renderComment'
import { getPostFilenameByParams } from '@/lib/posts'
import { getSupabaseServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const PUBLIC_COLUMNS = 'id, username, content, created_at, url, parent_comment_id'
const RENDER_CONCURRENCY = 8
const readRateLimiter = new FixedWindowRateLimiter(120, 60 * 1000)

interface PublicComment {
	id: number
	username: string
	content: string
	created_at: string
	url: string
	parent_comment_id: number | null
}

function isValidPublicComment(
	value: unknown,
	candidateUrls: readonly string[]
): value is PublicComment {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false

	const comment = value as Record<string, unknown>
	return (
		Number.isSafeInteger(comment.id) &&
		(comment.id as number) > 0 &&
		typeof comment.username === 'string' &&
		comment.username.trim().length > 0 &&
		comment.username.length <= 64 &&
		typeof comment.content === 'string' &&
		comment.content.trim().length > 0 &&
		comment.content.length <= 5000 &&
		typeof comment.created_at === 'string' &&
		comment.created_at.length <= 64 &&
		Number.isFinite(Date.parse(comment.created_at)) &&
		typeof comment.url === 'string' &&
		candidateUrls.includes(comment.url) &&
		(comment.parent_comment_id === null ||
			(Number.isSafeInteger(comment.parent_comment_id) &&
				(comment.parent_comment_id as number) > 0))
	)
}

function getCommentIdForLog(value: unknown): string {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return 'unknown'
	const id = (value as Record<string, unknown>).id
	return Number.isSafeInteger(id) ? String(id) : 'unknown'
}

function errorResponse(message: string, status: number, extra?: HeadersInit) {
	const headers = new Headers(extra)
	headers.set('Cache-Control', 'no-store')
	return NextResponse.json({ error: message }, { status, headers })
}

function logServerError(context: string, error: unknown) {
	console.error(
		context,
		error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'
	)
}

function logDatabaseError(context: string, error: unknown) {
	const code =
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof error.code === 'string'
			? error.code
			: 'unknown'
	console.error(context, code)
}

export async function GET(request: NextRequest) {
	if (process.env.COMMENT_API_ENABLED !== 'true') {
		return errorResponse('Not found', 404)
	}

	try {
		const thread = resolveCommentThread(request.headers.get('referer'))
		if (
			!getPostFilenameByParams(
				thread.year,
				thread.month,
				thread.slug,
				thread.locale
			)
		) {
			throw new CommentRequestError('Invalid comment page')
		}
		const limitResult = readRateLimiter.consume(
			`ip:${getClientIp(request.headers)}`
		)
		if (!limitResult.allowed) {
			return errorResponse('Too many requests. Please try again later.', 429, {
				'Retry-After': String(limitResult.retryAfterSeconds),
			})
		}
		const pagination = parseCommentPagination(request.nextUrl)

		let database
		try {
			database = getSupabaseServerClient()
		} catch (error) {
			logServerError('Comment database configuration failed:', error)
			throw new CommentServiceUnavailableError('Comment database is unavailable')
		}

		// Fetch one extra record to report whether another bounded page exists.
		// Newest records are selected first, then restored to chronological order
		// for the current CommentList client.
		const { data, error } = await database
			.from('comments')
			.select(PUBLIC_COLUMNS)
			.in('url', thread.candidateUrls)
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.range(pagination.offset, pagination.offset + pagination.limit)

		if (error) {
			logDatabaseError('Comment query failed:', error)
			throw new Error('Comment query failed')
		}

		const comments = data ?? []
		const page: PublicComment[] = []
		for (const comment of comments.slice(0, pagination.limit)) {
			if (isValidPublicComment(comment, thread.candidateUrls)) {
				page.push(comment)
			} else {
				console.warn(`Skipped invalid stored comment ${getCommentIdForLog(comment)}`)
			}
		}
		page.reverse()
		const rendered = await mapWithConcurrency(
			page,
			RENDER_CONCURRENCY,
			async (comment) => ({
				...comment,
				content: await renderCommentHtml(comment.content || ''),
			})
		)
		const headers = new Headers({
			'Cache-Control': 'no-store',
			'X-Comment-Page': String(pagination.page),
			'X-Comment-Limit': String(pagination.limit),
			'X-Comment-Has-More': String(comments.length > pagination.limit),
		})
		return NextResponse.json(rendered, { headers })
	} catch (error) {
		if (error instanceof CommentRequestError) {
			return errorResponse(error.message, error.status)
		}
		if (error instanceof CommentServiceUnavailableError) {
			return errorResponse('Comment service is temporarily unavailable', 503)
		}

		logServerError('Comment retrieval failed:', error)
		return errorResponse('Unable to load comments', 500)
	}
}
