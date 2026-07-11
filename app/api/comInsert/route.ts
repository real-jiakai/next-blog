import { createHash } from 'node:crypto'

import validator from 'email-validator'
import nodemailer from 'nodemailer'
import { NextRequest, NextResponse, after } from 'next/server'

import {
	CommentRequestError,
	CommentServiceUnavailableError,
	FixedWindowRateLimiter,
	createEmailVerificationToken,
	getClientIp,
	hasTrustedOrigin,
	isCommentApiEnabled,
	readLimitedJsonBody,
	resolveCommentThread,
	verifyEmailVerificationToken,
	verifyTurnstileToken,
} from '@/lib/commentSecurity'
import { commentToPlainText, escapeHtml } from '@/lib/renderComment'
import { getPostFilenameByParams } from '@/lib/posts'
import { getSupabaseServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const LIMITS = {
	username: 64,
	email: 254,
	website: 200,
	content: 5000,
} as const

const TURNSTILE_ACTION =
	process.env.CLOUDFLARE_TURNSTILE_EXPECTED_ACTION ?? 'comment'
// Bound the expensive upstream challenge before making the Cloudflare request.
// The per-IP bucket handles normal abuse, while the bounded global bucket also
// protects deployments whose proxy header is accidentally spoofable.
const turnstileAttemptRateLimiter = new FixedWindowRateLimiter(
	20,
	10 * 60 * 1000
)
const globalTurnstileAttemptRateLimiter = new FixedWindowRateLimiter(
	300,
	10 * 60 * 1000,
	1
)
const submissionRateLimiter = new FixedWindowRateLimiter(5, 10 * 60 * 1000)
const emailRateLimiter = new FixedWindowRateLimiter(5, 60 * 60 * 1000)
const verificationRateLimiter = new FixedWindowRateLimiter(30, 60 * 60 * 1000)
const replyNotificationRateLimiter = new FixedWindowRateLimiter(
	3,
	60 * 60 * 1000
)
const masterNotificationRateLimiter = new FixedWindowRateLimiter(
	30,
	60 * 60 * 1000,
	1
)

interface ValidatedCommentInput {
	username: string
	email: string
	website: string
	content: string
	token: string
	parentCommentId: number | null
}

interface ParentComment {
	id: number
	email: string
	email_verified_at: string | null
	url: string
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null | undefined

function noStoreHeaders(extra?: HeadersInit): Headers {
	const headers = new Headers(extra)
	headers.set('Cache-Control', 'no-store')
	return headers
}

function errorResponse(message: string, status: number, extra?: HeadersInit) {
	return NextResponse.json(
		{ error: message },
		{ status, headers: noStoreHeaders(extra) }
	)
}

function rateLimitResponse(retryAfterSeconds: number) {
	return errorResponse('Too many requests. Please try again later.', 429, {
		'Retry-After': String(retryAfterSeconds),
	})
}

function disabledResponse() {
	return errorResponse('Not found', 404)
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

function getCommentDatabase() {
	try {
		return getSupabaseServerClient()
	} catch (error) {
		logServerError('Comment database configuration failed:', error)
		throw new CommentServiceUnavailableError('Comment database is unavailable')
	}
}

function normalizeWebsite(value: unknown): string {
	if (value == null || value === '') return ''
	if (typeof value !== 'string' || value.length > LIMITS.website) {
		throw new CommentRequestError('Invalid website')
	}

	let parsed: URL
	try {
		parsed = new URL(value.trim())
	} catch {
		throw new CommentRequestError('Invalid website')
	}
	if (
		(parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
		parsed.username ||
		parsed.password
	) {
		throw new CommentRequestError('Invalid website')
	}
	return parsed.href
}

function validateCommentInput(body: unknown): ValidatedCommentInput {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new CommentRequestError('Invalid request body')
	}

	const {
		username,
		email,
		website,
		content,
		token,
		parent_comment_id: parentCommentId,
	} = body as Record<string, unknown>

	if (typeof username !== 'string') {
		throw new CommentRequestError('Invalid username')
	}
	const normalizedUsername = username.trim()
	if (!normalizedUsername || normalizedUsername.length > LIMITS.username) {
		throw new CommentRequestError('Invalid username')
	}

	if (typeof email !== 'string') {
		throw new CommentRequestError('Invalid email')
	}
	const normalizedEmail = email.trim().toLowerCase()
	if (
		normalizedEmail.length > LIMITS.email ||
		!validator.validate(normalizedEmail)
	) {
		throw new CommentRequestError('Invalid email')
	}

	if (
		typeof content !== 'string' ||
		!content.trim() ||
		content.length > LIMITS.content
	) {
		throw new CommentRequestError('Invalid content')
	}
	if (typeof token !== 'string' || !token) {
		throw new CommentRequestError('Missing verification token', 403)
	}
	if (
		parentCommentId != null &&
		(!Number.isSafeInteger(parentCommentId) || (parentCommentId as number) < 1)
	) {
		throw new CommentRequestError('Invalid parent comment id')
	}

	return {
		username: normalizedUsername,
		email: normalizedEmail,
		website: normalizeWebsite(website),
		content,
		token,
		parentCommentId:
			typeof parentCommentId === 'number' ? parentCommentId : null,
	}
}

function getEmailTransporter() {
	if (cachedTransporter !== undefined) return cachedTransporter

	const host = process.env.EMAIL_HOST
	const username = process.env.EMAIL_USERNAME
	const password = process.env.EMAIL_PASSWORD
	const port = Number(process.env.EMAIL_PORT ?? '587')
	if (
		!host ||
		!username ||
		!password ||
		!Number.isInteger(port) ||
		port < 1 ||
		port > 65_535
	) {
		cachedTransporter = null
		return cachedTransporter
	}

	const secure = process.env.EMAIL_SECURE === 'true'
	cachedTransporter = nodemailer.createTransport({
		host,
		port,
		secure,
		requireTLS: !secure,
		auth: { user: username, pass: password },
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 20_000,
	})
	return cachedTransporter
}

async function getValidatedParentComment(
	parentCommentId: number | null,
	candidateUrls: string[]
): Promise<ParentComment | null> {
	if (parentCommentId == null) return null

	const { data, error } = await getCommentDatabase()
		.from('comments')
		.select('id, email, email_verified_at, url')
		.eq('id', parentCommentId)
		.in('url', candidateUrls)
		.maybeSingle()

	if (error) {
		logDatabaseError('Parent comment lookup failed:', error)
		throw new Error('Parent comment lookup failed')
	}
	if (!data) throw new CommentRequestError('Invalid parent comment id')
	return data as ParentComment
}

async function sendNotificationEmails({
	commentId,
	input,
	parentComment,
	canonicalUrl,
}: {
	commentId: number
	input: ValidatedCommentInput
	parentComment: ParentComment | null
	canonicalUrl: string
}) {
	const transporter = getEmailTransporter()
	if (!transporter) return

	let plainText: string
	try {
		plainText = await commentToPlainText(input.content)
	} catch (error) {
		logServerError('Comment notification rendering failed:', error)
		return
	}

	const safeUsername = escapeHtml(input.username)
	const safeText = escapeHtml(plainText)
	const safeUrl = escapeHtml(canonicalUrl)
	const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'
	const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USERNAME

	const verificationSecret = process.env.COMMENT_EMAIL_VERIFICATION_SECRET
	if (verificationSecret && verificationSecret.length >= 32) {
		try {
			const token = createEmailVerificationToken(commentId, verificationSecret)
			const verificationUrl = new URL('/api/comInsert', canonicalUrl)
			verificationUrl.searchParams.set('verify', token)
			const safeVerificationUrl = escapeHtml(verificationUrl.href)
			await transporter.sendMail({
				from,
				to: input.email,
				subject: `Verify comment notifications from ${siteTitle}`,
				text: `Verify your email to receive replies to this comment: ${verificationUrl.href}`,
				html: `<p>Verify your email to receive replies to this comment:</p><p><a href="${safeVerificationUrl}">Verify comment notifications</a></p>`,
			})
		} catch (error) {
			logServerError('Comment email verification delivery failed:', error)
		}
	}

	if (
		parentComment?.email_verified_at &&
		typeof parentComment.email === 'string' &&
		validator.validate(parentComment.email)
	) {
		const notificationLimit = replyNotificationRateLimiter.consume(
			`parent:${parentComment.id}`
		)
		if (notificationLimit.allowed) {
			try {
				await transporter.sendMail({
					from,
					to: parentComment.email,
					subject: `New reply to your comment in ${siteTitle}`,
					text: `${input.username} replied to your comment: ${plainText}. Please visit ${canonicalUrl} to view it.`,
					html: `<p>${safeUsername} replied to your comment: ${safeText}.<br> Please visit <a href="${safeUrl}">${safeUrl}</a> to view it.</p>`,
				})
			} catch (error) {
				logServerError('Reply notification delivery failed:', error)
			}
		}
	}

	const masterEmail = process.env.MASTER_EMAIL
	const masterLimit = masterNotificationRateLimiter.consume('master')
	if (masterEmail && validator.validate(masterEmail) && masterLimit.allowed) {
		try {
			await transporter.sendMail({
				from,
				to: masterEmail,
				subject: `New comment on ${siteTitle}`,
				text: `${input.username} commented: ${plainText}. Please visit ${canonicalUrl} to view it.`,
				html: `<p>${safeUsername} commented: ${safeText}.<br> Please visit <a href="${safeUrl}">${safeUrl}</a> to view it.</p>`,
			})
		} catch (error) {
			logServerError('Master notification delivery failed:', error)
		}
	}
}

export async function POST(request: NextRequest) {
	if (!isCommentApiEnabled()) return disabledResponse()
	if (request.nextUrl.searchParams.has('verify')) {
		return completeEmailVerification(request)
	}

	const clientIp = getClientIp(request.headers)

	try {
		if (!hasTrustedOrigin(request.headers.get('origin'))) {
			throw new CommentRequestError('Invalid request origin', 403)
		}
		const fetchSite = request.headers.get('sec-fetch-site')
		if (fetchSite && fetchSite !== 'same-origin') {
			throw new CommentRequestError('Invalid request origin', 403)
		}

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
		const input = validateCommentInput(await readLimitedJsonBody(request))
		const attemptLimit = turnstileAttemptRateLimiter.consume(`ip:${clientIp}`)
		if (!attemptLimit.allowed) {
			return rateLimitResponse(attemptLimit.retryAfterSeconds)
		}
		const globalAttemptLimit = globalTurnstileAttemptRateLimiter.consume('global')
		if (!globalAttemptLimit.allowed) {
			return rateLimitResponse(globalAttemptLimit.retryAfterSeconds)
		}

		const turnstileResult = await verifyTurnstileToken(input.token, {
			secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
			expectedAction: TURNSTILE_ACTION,
			expectedHostname:
				process.env.CLOUDFLARE_TURNSTILE_EXPECTED_HOSTNAME ?? thread.hostname,
			remoteIp: clientIp,
		})
		if (!turnstileResult.valid) {
			console.warn(`Turnstile rejected a comment: ${turnstileResult.reason}`)
			return errorResponse('Verification failed', 403)
		}
		const submissionLimit = submissionRateLimiter.consume(`ip:${clientIp}`)
		if (!submissionLimit.allowed) {
			return rateLimitResponse(submissionLimit.retryAfterSeconds)
		}

		const emailHash = createHash('sha256').update(input.email).digest('hex')
		const emailLimit = emailRateLimiter.consume(`email:${emailHash}`)
		if (!emailLimit.allowed) {
			return rateLimitResponse(emailLimit.retryAfterSeconds)
		}

		const parentComment = await getValidatedParentComment(
			input.parentCommentId,
			thread.candidateUrls
		)
		const { data: insertedComment, error } = await getCommentDatabase()
			.from('comments')
			.insert({
				username: input.username,
				email: input.email,
				website: input.website,
				content: input.content,
				url: thread.canonicalUrl,
				parent_comment_id: input.parentCommentId,
			})
			.select('id, username, content, created_at, url, parent_comment_id')
			.single()

		if (error || !insertedComment) {
			if (error) logDatabaseError('Comment insert failed:', error)
			throw new Error('Comment insert failed')
		}

		after(async () => {
			try {
				await sendNotificationEmails({
					commentId: insertedComment.id,
					input,
					parentComment,
					canonicalUrl: thread.canonicalUrl,
				})
			} catch (error) {
				logServerError('Comment notification task failed:', error)
			}
		})

		return NextResponse.json([insertedComment], {
			headers: noStoreHeaders(),
		})
	} catch (error) {
		if (error instanceof CommentRequestError) {
			return errorResponse(error.message, error.status)
		}
		if (error instanceof CommentServiceUnavailableError) {
			logServerError('Comment service configuration/upstream error:', error)
			return errorResponse('Comment service is temporarily unavailable', 503)
		}

		logServerError('Comment submission failed:', error)
		return errorResponse('Unable to save comment', 500)
	}
}

function getValidEmailVerification(request: NextRequest) {
	const token = request.nextUrl.searchParams.get('verify') ?? ''
	const secret = process.env.COMMENT_EMAIL_VERIFICATION_SECRET
	if (!secret || secret.length < 32) {
		throw new CommentServiceUnavailableError(
			'Comment email verification secret is not configured'
		)
	}
	const verifiedToken = verifyEmailVerificationToken(token, secret)
	if (!verifiedToken) {
		throw new CommentRequestError('Verification link is invalid or expired')
	}
	return verifiedToken
}

async function completeEmailVerification(request: NextRequest) {
	const clientIp = getClientIp(request.headers)

	try {
		if (!hasTrustedOrigin(request.headers.get('origin'))) {
			throw new CommentRequestError('Invalid request origin', 403)
		}
		const fetchSite = request.headers.get('sec-fetch-site')
		if (fetchSite && fetchSite !== 'same-origin') {
			throw new CommentRequestError('Invalid request origin', 403)
		}
		const verifiedToken = getValidEmailVerification(request)
		const limit = verificationRateLimiter.consume(`verify:${clientIp}`)
		if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

		const { data, error } = await getCommentDatabase()
			.from('comments')
			.update({ email_verified_at: new Date().toISOString() })
			.eq('id', verifiedToken.commentId)
			.select('id, url')
			.maybeSingle()
		if (error || !data) {
			if (error) logDatabaseError('Email verification update failed:', error)
			throw new Error('Email verification update failed')
		}

		const thread = resolveCommentThread(data.url)
		const redirectUrl = new URL(thread.canonicalUrl)
		redirectUrl.hash = `comment-${data.id}`
		return NextResponse.redirect(redirectUrl, {
			status: 303,
			headers: noStoreHeaders({
				'Referrer-Policy': 'no-referrer',
				'X-Robots-Tag': 'noindex, nofollow',
			}),
		})
	} catch (error) {
		if (error instanceof CommentRequestError) {
			return errorResponse(error.message, error.status)
		}
		if (error instanceof CommentServiceUnavailableError) {
			logServerError('Comment email verification unavailable:', error)
			return errorResponse('Verification service is temporarily unavailable', 503)
		}

		logServerError('Comment email verification failed:', error)
		return errorResponse('Unable to verify email', 500)
	}
}

export async function GET(request: NextRequest) {
	if (!isCommentApiEnabled()) return disabledResponse()

	const clientIp = getClientIp(request.headers)

	try {
		getValidEmailVerification(request)
		const limit = verificationRateLimiter.consume(`verify-page:${clientIp}`)
		if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)
		const action = escapeHtml(request.nextUrl.pathname + request.nextUrl.search)
		const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm comment email</title></head><body><main><h1>Confirm comment email</h1><p>Confirm that you want reply notifications for this comment.</p><form method="post" action="${action}"><button type="submit">Confirm email</button></form></main></body></html>`
		return new NextResponse(html, {
			headers: noStoreHeaders({
				'Content-Type': 'text/html; charset=utf-8',
				'Referrer-Policy': 'no-referrer',
				'X-Robots-Tag': 'noindex, nofollow',
			}),
		})
	} catch (error) {
		if (error instanceof CommentRequestError) {
			return errorResponse(error.message, error.status)
		}
		if (error instanceof CommentServiceUnavailableError) {
			logServerError('Comment email verification unavailable:', error)
			return errorResponse('Verification service is temporarily unavailable', 503)
		}

		logServerError('Comment email verification page failed:', error)
		return errorResponse('Unable to verify email', 500)
	}
}
