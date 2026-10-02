import { describe, expect, it, vi } from 'vitest'

import {
	COMMENT_LIMITS,
	CommentRequestError,
	CommentServiceUnavailableError,
	FixedWindowRateLimiter,
	TURNSTILE_TOKEN_MAX_LENGTH,
	createEmailVerificationToken,
	getClientIp,
	hasTrustedOrigin,
	isCommentApiEnabled,
	mapWithConcurrency,
	parseCommentPagination,
	readLimitedJsonBody,
	resolveCommentThread,
	toPublicWebsite,
	validateCommentInput,
	verifyEmailVerificationToken,
	verifyTurnstileToken,
} from '@/lib/commentSecurity'

const SITE_URL = 'https://example.com'

describe('comment feature configuration', () => {
	it('follows the build-time UI flag when no runtime override is present', () => {
		expect(
			isCommentApiEnabled({ NEXT_PUBLIC_SHOW_COMMENT: 'true' })
		).toBe(true)
		expect(isCommentApiEnabled({ NEXT_PUBLIC_SHOW_COMMENT: 'false' })).toBe(
			false
		)
	})

	it('keeps an explicit runtime kill switch authoritative', () => {
		expect(
			isCommentApiEnabled({
				COMMENT_API_ENABLED: 'false',
				NEXT_PUBLIC_SHOW_COMMENT: 'true',
			})
		).toBe(false)
		expect(
			isCommentApiEnabled({
				COMMENT_API_ENABLED: 'true',
				NEXT_PUBLIC_SHOW_COMMENT: 'false',
			})
		).toBe(true)
	})

	it('fails closed for an invalid explicit runtime value', () => {
		expect(
			isCommentApiEnabled({
				COMMENT_API_ENABLED: '',
				NEXT_PUBLIC_SHOW_COMMENT: 'true',
			})
		).toBe(false)
		expect(
			isCommentApiEnabled({
				COMMENT_API_ENABLED: 'yes',
				NEXT_PUBLIC_SHOW_COMMENT: 'true',
			})
		).toBe(false)
	})
})

describe('comment thread validation', () => {
	it('canonicalizes locale variants and preserves legacy candidates', () => {
		const thread = resolveCommentThread(
			'https://example.com/en/2026/07/weekly-issue?utm_source=test#comments',
			SITE_URL
		)

		expect(thread.canonicalUrl).toBe(
			'https://example.com/2026/07/weekly-issue'
		)
		expect(thread.candidateUrls).toContain(
			'https://example.com/en/2026/07/weekly-issue'
		)
		expect(thread.candidateUrls).toContain(
			'https://example.com/zh/2026/07/weekly-issue/'
		)
		expect(thread).toMatchObject({
			locale: 'en',
			year: '2026',
			month: '07',
			slug: 'weekly-issue',
		})
	})

	it('stores a percent-encoded slug under its canonical spelling', () => {
		const thread = resolveCommentThread(
			'https://example.com/2026/07/weekly%2Dissue',
			SITE_URL
		)

		expect(thread.canonicalUrl).toBe('https://example.com/2026/07/weekly-issue')
		expect(thread.slug).toBe('weekly-issue')
		expect(thread.candidateUrls).toContain(
			'https://example.com/2026/07/weekly%2Dissue'
		)
	})

	it.each([
		'https://attacker.example/2026/07/weekly-issue',
		'https://example.com/about',
		'https://example.com/2026/13/weekly-issue',
		'https://example.com/2026/07/a%2Fb',
	])('rejects a non-canonical comment thread: %s', (referer) => {
		expect(() => resolveCommentThread(referer, SITE_URL)).toThrow(
			CommentRequestError
		)
	})

	it('requires an exact configured Origin header', () => {
		expect(hasTrustedOrigin('https://example.com', SITE_URL)).toBe(true)
		expect(hasTrustedOrigin('https://example.com/', SITE_URL)).toBe(false)
		expect(hasTrustedOrigin('https://attacker.example', SITE_URL)).toBe(false)
	})
})

describe('bounded request parsing', () => {
	it('parses JSON within the byte limit', async () => {
		const request = new Request('https://example.com/api/comInsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body: JSON.stringify({ ok: true }),
		})
		await expect(readLimitedJsonBody(request, 64)).resolves.toEqual({ ok: true })
	})

	it('rejects a streamed body larger than the cap', async () => {
		const request = new Request('https://example.com/api/comInsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ value: 'too large' }),
		})
		await expect(readLimitedJsonBody(request, 8)).rejects.toMatchObject({
			status: 413,
		})
	})

	it('accepts a full-length Chinese comment at the default limit', async () => {
		const request = new Request('https://example.com/api/comInsert', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				username: '读'.repeat(COMMENT_LIMITS.username),
				email: `${'a'.repeat(240)}@example.com`,
				website: `https://example.com/${'a'.repeat(180)}`,
				content: '留'.repeat(COMMENT_LIMITS.content),
				token: 'x'.repeat(TURNSTILE_TOKEN_MAX_LENGTH),
				parent_comment_id: 123456,
			}),
		})
		await expect(readLimitedJsonBody(request)).resolves.toMatchObject({
			content: '留'.repeat(COMMENT_LIMITS.content),
		})
	})

	it('rejects unsupported content types before parsing', async () => {
		const request = new Request('https://example.com/api/comInsert', {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: '{}',
		})
		await expect(readLimitedJsonBody(request)).rejects.toMatchObject({
			status: 415,
		})
	})
})

describe('bounded rate limiting and pagination', () => {
	it('trusts only the explicitly configured client IP header', () => {
		const previous = process.env.COMMENT_CLIENT_IP_HEADER
		const headers = new Headers({
			'cf-connecting-ip': '198.51.100.8',
			'x-real-ip': '192.0.2.7',
		})
		try {
			delete process.env.COMMENT_CLIENT_IP_HEADER
			expect(getClientIp(headers)).toBe('unknown')
			process.env.COMMENT_CLIENT_IP_HEADER = 'x-real-ip'
			expect(getClientIp(headers)).toBe('192.0.2.7')
			process.env.COMMENT_CLIENT_IP_HEADER = 'x-forwarded-for'
			expect(getClientIp(headers)).toBe('unknown')
			expect(
				getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))
			).toBe('203.0.113.9')
			expect(
				getClientIp(new Headers({ 'x-forwarded-for': 'not-an-ip, 10.0.0.1' }))
			).toBe('unknown')
		} finally {
			if (previous === undefined) delete process.env.COMMENT_CLIENT_IP_HEADER
			else process.env.COMMENT_CLIENT_IP_HEADER = previous
		}
	})

	it('limits a key and resets it after the window', () => {
		const limiter = new FixedWindowRateLimiter(2, 1000)
		expect(limiter.consume('client', 100).allowed).toBe(true)
		expect(limiter.consume('client', 200).allowed).toBe(true)
		expect(limiter.consume('client', 300)).toMatchObject({
			allowed: false,
			remaining: 0,
		})
		expect(limiter.consume('client', 1100).allowed).toBe(true)
	})

	it('caps page size and total offset', () => {
		expect(
			parseCommentPagination(new URL('https://example.com/api/comSelect?page=2&limit=25'))
		).toEqual({ page: 2, limit: 25, offset: 25 })
		expect(() =>
			parseCommentPagination(new URL('https://example.com/api/comSelect?limit=101'))
		).toThrow(CommentRequestError)
		expect(() =>
			parseCommentPagination(new URL('https://example.com/api/comSelect?page=999999'))
		).toThrow(CommentRequestError)
	})

	it('bounds concurrent async rendering while preserving result order', async () => {
		let active = 0
		let maximumActive = 0
		const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
			active += 1
			maximumActive = Math.max(maximumActive, active)
			await Promise.resolve()
			active -= 1
			return item * 2
		})

		expect(maximumActive).toBeLessThanOrEqual(2)
		expect(results).toEqual([2, 4, 6, 8, 10])
	})
})

describe('Turnstile verification', () => {
	const respondWith = (body: unknown) =>
		vi.fn(async () =>
			new Response(JSON.stringify(body), { status: 200 })
		) as unknown as typeof fetch

	it('accepts a successful challenge for the configured hostname and action', async () => {
		const fetchImplementation = vi.fn(async () =>
			new Response(
				JSON.stringify({
					success: true,
					hostname: 'example.com',
					action: 'comment',
				}),
				{ status: 200 }
			)
		) as unknown as typeof fetch

		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				remoteIp: '192.0.2.10',
				fetchImplementation,
			})
		).resolves.toEqual({ valid: true })
		expect(fetchImplementation).toHaveBeenCalledOnce()
	})

	it('rejects a failed challenge', async () => {
		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation: respondWith({
					success: false,
					hostname: 'example.com',
					action: 'comment',
				}),
			})
		).resolves.toEqual({ valid: false, reason: 'challenge' })
	})

	it.each([
		{ hostname: 'attacker.example' },
		{ hostname: 'example.com.attacker.example' },
		{},
	])('rejects a challenge solved for another hostname: %o', async (host) => {
		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation: respondWith({
					success: true,
					action: 'comment',
					...host,
				}),
			})
		).resolves.toEqual({ valid: false, reason: 'hostname' })
	})

	it('fails closed without a configured secret', async () => {
		const fetchImplementation = vi.fn() as unknown as typeof fetch
		await expect(
			verifyTurnstileToken('valid-token', {
				secret: undefined,
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation,
			})
		).rejects.toBeInstanceOf(CommentServiceUnavailableError)
		expect(fetchImplementation).not.toHaveBeenCalled()
	})

	it('rejects blank, padded or oversized tokens without calling Cloudflare', async () => {
		const fetchImplementation = vi.fn() as unknown as typeof fetch
		for (const token of ['', ' ', ' t', 't\n', 'x'.repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1)]) {
			await expect(
				verifyTurnstileToken(token, {
					secret: 's',
					expectedAction: 'comment',
					expectedHostname: 'example.com',
					fetchImplementation,
				})
			).resolves.toEqual({ valid: false, reason: 'challenge' })
		}
		expect(fetchImplementation).not.toHaveBeenCalled()
	})

	it('rejects a valid challenge issued for another action', async () => {
		const fetchImplementation = vi.fn(async () =>
			new Response(
				JSON.stringify({
					success: true,
					hostname: 'example.com',
					action: 'login',
				})
			)
		) as unknown as typeof fetch

		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation,
			})
		).resolves.toEqual({ valid: false, reason: 'action' })
	})

	it('treats HTTP failures as an unavailable verification service', async () => {
		const fetchImplementation = vi.fn(async () =>
			new Response('upstream failure', { status: 503 })
		) as unknown as typeof fetch

		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation,
			})
		).rejects.toBeInstanceOf(CommentServiceUnavailableError)
	})

	it('rejects an oversized verification response while streaming it', async () => {
		const fetchImplementation = vi.fn(async () =>
			new Response('x'.repeat(8 * 1024 + 1))
		) as unknown as typeof fetch

		await expect(
			verifyTurnstileToken('valid-token', {
				secret: 'secret',
				expectedAction: 'comment',
				expectedHostname: 'example.com',
				fetchImplementation,
			})
		).rejects.toThrow('too large')
	})
})

describe('comment input validation', () => {
	const valid = {
		username: ' Alice ',
		email: ' Alice@Example.com ',
		website: '',
		content: 'Hello',
		token: 'token',
		parent_comment_id: null,
	}

	it('normalizes valid input', () => {
		expect(
			validateCommentInput({ ...valid, website: 'https://example.com', parent_comment_id: 7 })
		).toEqual({
			username: 'Alice',
			email: 'alice@example.com',
			website: 'https://example.com/',
			content: 'Hello',
			token: 'token',
			parentCommentId: 7,
		})
	})

	it.each([
		['username', '', 'Invalid username'],
		['username', 'a\u0000b', 'Invalid username'],
		['username', 'a\nb', 'Invalid username'],
		['username', '\u200b\u200b', 'Invalid username'],
		['username', 'x'.repeat(65), 'Invalid username'],
		['content', 'a\u0000b', 'Invalid content'],
		['content', ' \n ', 'Invalid content'],
		['website', 'ftp://example.com', 'Invalid website'],
		['website', 'https://user:pass@example.com', 'Invalid website'],
		// 190 characters raw, but percent-encoding makes the stored URL far longer.
		['website', `https://example.com/${'文章'.repeat(85)}`, 'Invalid website'],
	])('rejects an invalid %s: %j', (field, value, message) => {
		expect(() => validateCommentInput({ ...valid, [field]: value })).toThrow(
			new CommentRequestError(message)
		)
	})

	it('keeps pasted control characters other than NUL in content', () => {
		expect(validateCommentInput({ ...valid, content: 'a\tb\r\nc' }).content).toBe(
			'a\tb\r\nc'
		)
	})

	it('treats a missing token as a failed challenge', () => {
		expect(() => validateCommentInput({ ...valid, token: '' })).toThrow(
			expect.objectContaining({ status: 403 })
		)
	})
})

describe('public commenter website', () => {
	it('returns a stored http(s) website in normalized form', () => {
		expect(toPublicWebsite('https://example.com')).toBe('https://example.com/')
		expect(toPublicWebsite(' http://example.com/blog ')).toBe(
			'http://example.com/blog'
		)
	})

	it.each([
		null,
		undefined,
		'',
		'   ',
		42,
		'example.com',
		'javascript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'ftp://example.com',
		'https://user:pass@example.com',
		`https://example.com/${'a'.repeat(200)}`,
	])('hides an unusable stored value: %j', (value) => {
		expect(toPublicWebsite(value)).toBeNull()
	})
})

describe('comment notification email verification', () => {
	it('accepts an untampered, unexpired token', () => {
		const secret = 'a-secure-random-value-that-is-at-least-32-bytes'
		const token = createEmailVerificationToken(42, secret, 1000, 5000)
		expect(verifyEmailVerificationToken(token, secret, 2000)).toEqual({
			commentId: 42,
		})
	})

	it('rejects expired and tampered tokens', () => {
		const secret = 'a-secure-random-value-that-is-at-least-32-bytes'
		const token = createEmailVerificationToken(42, secret, 1000, 5000)
		expect(verifyEmailVerificationToken(token, secret, 6001)).toBeNull()
		expect(verifyEmailVerificationToken(`43${token.slice(2)}`, secret, 2000)).toBeNull()
	})
})
