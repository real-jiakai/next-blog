import { createHmac, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'

export const COMMENT_BODY_LIMIT_BYTES = 12 * 1024
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048
export const DEFAULT_COMMENT_PAGE_SIZE = 100
export const MAX_COMMENT_PAGE_SIZE = 100
export const MAX_COMMENT_OFFSET = 10_000

const COMMENT_PATH_PATTERN =
	/^\/(?:(en|zh)\/)?(\d{4})\/(0[1-9]|1[0-2])\/([^/]+)\/?$/
const TURNSTILE_RESPONSE_LIMIT_BYTES = 8 * 1024

export class CommentRequestError extends Error {
	readonly status: number

	constructor(message: string, status = 400) {
		super(message)
		this.name = 'CommentRequestError'
		this.status = status
	}
}

export class CommentServiceUnavailableError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CommentServiceUnavailableError'
	}
}

export interface CommentThread {
	canonicalUrl: string
	candidateUrls: string[]
	hostname: string
	locale: 'zh' | 'en'
	year: string
	month: string
	slug: string
}

function parseConfiguredSiteUrl(value: string | undefined): URL {
	if (!value) {
		throw new CommentServiceUnavailableError('NEXT_PUBLIC_SITE_URL is not configured')
	}

	let parsed: URL
	try {
		parsed = new URL(value)
	} catch {
		throw new CommentServiceUnavailableError('NEXT_PUBLIC_SITE_URL is invalid')
	}

	if (
		(parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
		(parsed.protocol === 'http:' &&
			!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) ||
		parsed.username ||
		parsed.password ||
		(parsed.pathname !== '/' && parsed.pathname !== '') ||
		parsed.search ||
		parsed.hash
	) {
		throw new CommentServiceUnavailableError(
			'NEXT_PUBLIC_SITE_URL must contain only an HTTP(S) origin'
		)
	}

	return parsed
}

function addUrlVariant(target: Set<string>, origin: string, pathname: string) {
	const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
	target.add(`${origin}${withoutTrailingSlash}`)
	target.add(`${origin}${withoutTrailingSlash}/`)
}

/**
 * Converts an on-site post Referer into one locale-neutral thread URL. New
 * comments are always stored against the default-language URL; legacy locale
 * variants remain queryable so existing conversations are not lost.
 */
export function resolveCommentThread(
	referer: string | null,
	configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): CommentThread {
	const siteUrl = parseConfiguredSiteUrl(configuredSiteUrl)

	if (!referer || referer.length > 2048) {
		throw new CommentRequestError('Invalid comment page')
	}

	let parsed: URL
	try {
		parsed = new URL(referer)
	} catch {
		throw new CommentRequestError('Invalid comment page')
	}

	if (
		parsed.origin !== siteUrl.origin ||
		parsed.username ||
		parsed.password ||
		/%2f|%5c/i.test(parsed.pathname)
	) {
		throw new CommentRequestError('Invalid comment page')
	}

	const match = parsed.pathname.match(COMMENT_PATH_PATTERN)
	if (!match) {
		throw new CommentRequestError('Comments are only available on post pages')
	}

	let decodedSlug: string
	try {
		decodedSlug = decodeURIComponent(match[4])
	} catch {
		throw new CommentRequestError('Invalid comment page')
	}

	if (
		decodedSlug.length === 0 ||
		decodedSlug.length > 200 ||
		decodedSlug.trim() !== decodedSlug ||
		/[\u0000-\u001f\u007f]/.test(decodedSlug)
	) {
		throw new CommentRequestError('Invalid comment page')
	}

	const basePath = `/${match[2]}/${match[3]}/${match[4]}`
	const candidateUrls = new Set<string>()
	addUrlVariant(candidateUrls, siteUrl.origin, basePath)
	addUrlVariant(candidateUrls, siteUrl.origin, `/en${basePath}`)
	addUrlVariant(candidateUrls, siteUrl.origin, `/zh${basePath}`)

	return {
		canonicalUrl: `${siteUrl.origin}${basePath}`,
		candidateUrls: [...candidateUrls],
		hostname: siteUrl.hostname.toLowerCase(),
		locale: match[1] === 'en' ? 'en' : 'zh',
		year: match[2],
		month: match[3],
		slug: decodedSlug,
	}
}

export function hasTrustedOrigin(
	originHeader: string | null,
	configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): boolean {
	if (!originHeader || originHeader.length > 512) return false

	const siteUrl = parseConfiguredSiteUrl(configuredSiteUrl)
	try {
		const origin = new URL(originHeader)
		return (
			originHeader === origin.origin &&
			origin.origin === siteUrl.origin &&
			!origin.username &&
			!origin.password
		)
	} catch {
		return false
	}
}

function parseContentLength(header: string | null): number | null {
	if (header == null) return null
	if (!/^\d+$/.test(header)) {
		throw new CommentRequestError('Invalid Content-Length header')
	}

	const length = Number(header)
	if (!Number.isSafeInteger(length)) {
		throw new CommentRequestError('Invalid Content-Length header')
	}
	return length
}

/** Read and parse JSON without ever buffering more than maxBytes. */
export async function readLimitedJsonBody(
	request: Request,
	maxBytes = COMMENT_BODY_LIMIT_BYTES
): Promise<unknown> {
	const contentType = request.headers
		.get('content-type')
		?.split(';', 1)[0]
		.trim()
		.toLowerCase()
	if (contentType !== 'application/json') {
		throw new CommentRequestError('Content-Type must be application/json', 415)
	}

	const contentEncoding = request.headers.get('content-encoding')
	if (contentEncoding && contentEncoding.trim().toLowerCase() !== 'identity') {
		throw new CommentRequestError('Compressed request bodies are not supported', 415)
	}

	const declaredLength = parseContentLength(request.headers.get('content-length'))
	if (declaredLength != null && declaredLength > maxBytes) {
		throw new CommentRequestError('Request body is too large', 413)
	}

	if (!request.body) {
		throw new CommentRequestError('Invalid request body')
	}

	const reader = request.body.getReader()
	const decoder = new TextDecoder('utf-8', { fatal: true })
	let totalBytes = 0
	let text = ''

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			totalBytes += value.byteLength
			if (totalBytes > maxBytes) {
				await reader.cancel()
				throw new CommentRequestError('Request body is too large', 413)
			}
			text += decoder.decode(value, { stream: true })
		}
		text += decoder.decode()
	} catch (error) {
		if (error instanceof CommentRequestError) throw error
		throw new CommentRequestError('Invalid request body')
	}

	try {
		return JSON.parse(text)
	} catch {
		throw new CommentRequestError('Invalid request body')
	}
}

function normalizeIp(value: string | null): string | null {
	if (!value) return null
	let candidate = value.trim()
	if (!candidate || candidate.length > 64) return null

	const bracketed = candidate.match(/^\[([^\]]+)](?::\d+)?$/)
	if (bracketed) candidate = bracketed[1]

	const ipv4WithPort = candidate.match(/^([^:]+):(\d+)$/)
	if (ipv4WithPort && isIP(ipv4WithPort[1]) === 4) {
		candidate = ipv4WithPort[1]
	}

	return isIP(candidate) ? candidate : null
}

/** Read only the explicitly configured header that a trusted reverse proxy
 * overwrites. With no allowlisted header, callers share the fail-closed
 * `unknown` bucket instead of trusting attacker-supplied forwarding headers. */
export function getClientIp(headers: Headers): string {
	const trustedHeader = process.env.COMMENT_CLIENT_IP_HEADER?.toLowerCase()
	if (trustedHeader === 'x-forwarded-for') {
		const forwarded = headers.get(trustedHeader)?.split(',', 1)[0] ?? null
		return normalizeIp(forwarded) ?? 'unknown'
	}
	if (trustedHeader === 'cf-connecting-ip' || trustedHeader === 'x-real-ip') {
		return normalizeIp(headers.get(trustedHeader)) ?? 'unknown'
	}
	return 'unknown'
}

interface RateLimitEntry {
	count: number
	resetAt: number
}

export interface RateLimitResult {
	allowed: boolean
	remaining: number
	retryAfterSeconds: number
}

/**
 * A bounded per-process limiter suitable for this single-container deployment.
 * A multi-replica deployment should replace it with a shared Redis/edge limit.
 */
export class FixedWindowRateLimiter {
	private readonly entries = new Map<string, RateLimitEntry>()

	constructor(
		private readonly maximum: number,
		private readonly windowMs: number,
		private readonly maximumKeys = 10_000
	) {
		if (maximum < 1 || windowMs < 1 || maximumKeys < 1) {
			throw new Error('Rate limiter values must be positive')
		}
	}

	consume(key: string, now = Date.now()): RateLimitResult {
		let entry = this.entries.get(key)
		if (!entry || entry.resetAt <= now) {
			if (!entry && this.entries.size >= this.maximumKeys) {
				this.prune(now)
				if (this.entries.size >= this.maximumKeys) {
					const oldestKey = this.entries.keys().next().value as string | undefined
					if (oldestKey) this.entries.delete(oldestKey)
				}
			}

			entry = { count: 0, resetAt: now + this.windowMs }
			this.entries.set(key, entry)
		}

		entry.count += 1
		const allowed = entry.count <= this.maximum
		return {
			allowed,
			remaining: Math.max(0, this.maximum - entry.count),
			retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
		}
	}

	private prune(now: number) {
		for (const [key, entry] of this.entries) {
			if (entry.resetAt <= now) this.entries.delete(key)
		}
	}
}

export interface CommentPagination {
	page: number
	limit: number
	offset: number
}

function parsePositiveInteger(value: string | null, fallback: number): number {
	if (value == null) return fallback
	if (!/^[1-9]\d{0,5}$/.test(value)) {
		throw new CommentRequestError('Invalid pagination')
	}
	return Number(value)
}

export function parseCommentPagination(url: URL): CommentPagination {
	const page = parsePositiveInteger(url.searchParams.get('page'), 1)
	const limit = parsePositiveInteger(
		url.searchParams.get('limit'),
		DEFAULT_COMMENT_PAGE_SIZE
	)
	if (limit > MAX_COMMENT_PAGE_SIZE) {
		throw new CommentRequestError('Invalid pagination')
	}

	const offset = (page - 1) * limit
	if (!Number.isSafeInteger(offset) || offset > MAX_COMMENT_OFFSET) {
		throw new CommentRequestError('Invalid pagination')
	}

	return { page, limit, offset }
}

export async function mapWithConcurrency<T, R>(
	items: readonly T[],
	concurrency: number,
	mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new Error('Concurrency must be a positive integer')
	}

	const results = new Array<R>(items.length)
	let nextIndex = 0
	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => {
			while (nextIndex < items.length) {
				const index = nextIndex
				nextIndex += 1
				results[index] = await mapper(items[index], index)
			}
		}
	)

	await Promise.all(workers)
	return results
}

interface TurnstileResponse {
	success?: unknown
	hostname?: unknown
	action?: unknown
	'error-codes'?: unknown
}

async function readLimitedResponseText(
	response: Response,
	maximumBytes: number
): Promise<string> {
	if (!response.body) {
		throw new CommentServiceUnavailableError('Turnstile response was empty')
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder('utf-8', { fatal: true })
	let totalBytes = 0
	let text = ''

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			totalBytes += value.byteLength
			if (totalBytes > maximumBytes) {
				await reader.cancel()
				throw new CommentServiceUnavailableError(
					'Turnstile response was too large'
				)
			}
			text += decoder.decode(value, { stream: true })
		}
		text += decoder.decode()
		return text
	} catch (error) {
		if (error instanceof CommentServiceUnavailableError) throw error
		throw new CommentServiceUnavailableError(
			`Turnstile response failed: ${error instanceof Error ? error.name : 'unknown'}`
		)
	}
}

export interface TurnstileVerificationOptions {
	secret: string | undefined
	expectedAction: string
	expectedHostname: string
	remoteIp?: string
	timeoutMs?: number
	fetchImplementation?: typeof fetch
}

export interface TurnstileVerificationResult {
	valid: boolean
	reason?: 'challenge' | 'hostname' | 'action'
}

export async function verifyTurnstileToken(
	token: string,
	options: TurnstileVerificationOptions
): Promise<TurnstileVerificationResult> {
	if (!options.secret) {
		throw new CommentServiceUnavailableError('Turnstile secret is not configured')
	}
	if (!/^[a-zA-Z0-9_-]{1,32}$/.test(options.expectedAction)) {
		throw new CommentServiceUnavailableError('Turnstile action is invalid')
	}
	if (!options.expectedHostname || options.expectedHostname.includes(':')) {
		throw new CommentServiceUnavailableError('Turnstile hostname is invalid')
	}
	if (
		!token ||
		token !== token.trim() ||
		token.length > TURNSTILE_TOKEN_MAX_LENGTH
	) {
		return { valid: false, reason: 'challenge' }
	}

	const body = new URLSearchParams({
		secret: options.secret,
		response: token,
	})
	if (options.remoteIp && options.remoteIp !== 'unknown') {
		body.set('remoteip', options.remoteIp)
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000)
	let rawResponse: string
	try {
		const response = await (options.fetchImplementation ?? fetch)(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body,
				signal: controller.signal,
			}
		)
		if (!response.ok) {
			throw new CommentServiceUnavailableError(
				`Turnstile returned HTTP ${response.status}`
			)
		}
		rawResponse = await readLimitedResponseText(
			response,
			TURNSTILE_RESPONSE_LIMIT_BYTES
		)
	} catch (error) {
		if (error instanceof CommentServiceUnavailableError) throw error
		throw new CommentServiceUnavailableError(
			`Turnstile request failed: ${error instanceof Error ? error.name : 'unknown'}`
		)
	} finally {
		clearTimeout(timeout)
	}

	let data: TurnstileResponse
	try {
		data = JSON.parse(rawResponse) as TurnstileResponse
	} catch {
		throw new CommentServiceUnavailableError('Turnstile response was invalid')
	}

	if (data.success !== true) {
		return { valid: false, reason: 'challenge' }
	}
	if (
		typeof data.hostname !== 'string' ||
		data.hostname.toLowerCase().replace(/\.$/, '') !==
			options.expectedHostname.toLowerCase().replace(/\.$/, '')
	) {
		return { valid: false, reason: 'hostname' }
	}
	if (data.action !== options.expectedAction) {
		return { valid: false, reason: 'action' }
	}

	return { valid: true }
}

function emailVerificationSignature(commentId: number, expiresAt: number, secret: string) {
	return createHmac('sha256', secret)
		.update(`comment-email-v1:${commentId}:${expiresAt}`)
		.digest('base64url')
}

export function createEmailVerificationToken(
	commentId: number,
	secret: string,
	now = Date.now(),
	ttlMs = 48 * 60 * 60 * 1000
): string {
	if (!Number.isSafeInteger(commentId) || commentId < 1 || secret.length < 32) {
		throw new Error('Invalid email verification token configuration')
	}
	const expiresAt = now + ttlMs
	return `${commentId}.${expiresAt}.${emailVerificationSignature(
		commentId,
		expiresAt,
		secret
	)}`
}

export function verifyEmailVerificationToken(
	token: string,
	secret: string,
	now = Date.now()
): { commentId: number } | null {
	if (!token || token.length > 256 || secret.length < 32) return null
	const match = token.match(/^([1-9]\d*)\.([1-9]\d*)\.([A-Za-z0-9_-]{43})$/)
	if (!match) return null

	const commentId = Number(match[1])
	const expiresAt = Number(match[2])
	if (
		!Number.isSafeInteger(commentId) ||
		!Number.isSafeInteger(expiresAt) ||
		expiresAt < now
	) {
		return null
	}

	const expected = Buffer.from(
		emailVerificationSignature(commentId, expiresAt, secret),
		'utf8'
	)
	const actual = Buffer.from(match[3], 'utf8')
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
		return null
	}

	return { commentId }
}
