'use client'

import { useRef, useEffect, useState, FormEvent } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useTheme } from 'next-themes'
import validator from 'email-validator'

const TURNSTILE_FLEXIBLE_MIN_WIDTH = 300
type ResponsiveTurnstileSize = 'compact' | 'flexible'

// Mirrors COMMENT_LIMITS in lib/commentSecurity.ts, which is server-only.
const LIMITS = {
	username: 64,
	email: 254,
	website: 200,
	content: 5000,
} as const

type FieldName = 'username' | 'email' | 'website' | 'content'

const SERVER_FIELD_ERRORS = new Map<string, FieldName>([
	['Invalid username', 'username'],
	['Invalid email', 'email'],
	['Invalid website', 'website'],
	['Invalid content', 'content'],
])

export interface CommentFormDict {
	YourName: string
	NamePlaceholder: string
	Email: string
	EmailPlaceholder: string
	Website: string
	YourComment: string
	CommentPlaceholder: string
	Submit: string
	Submitting: string
	InvalidName: string
	InvalidEmail: string
	InvalidWebsite: string
	InvalidContent: string
	CommentAccepted: string
	PleaseVerify: string
	CommentError: string
	MarkdownTip: string
	ReplyingTo: string
	CancelReply: string
}

export interface CommentQuote {
	text: string
	// Bumped on every Quote click, so quoting the same comment again re-applies.
	n: number
}

export interface ReplyTarget {
	id: number
	username: string
}

interface CommentFormProps {
	quote: CommentQuote
	replyTo: ReplyTarget | null
	onCancelReply: () => void
	onSubmitted: () => void
	dict: CommentFormDict
}

interface FormElements extends HTMLFormControlsCollection {
	username: HTMLInputElement
	email: HTMLInputElement
	website: HTMLInputElement
	content: HTMLTextAreaElement
	'cf-turnstile-response': HTMLInputElement
}

interface CommentFormElement extends HTMLFormElement {
	readonly elements: FormElements
}

function isValidWebsite(value: string): boolean {
	if (!value.trim()) return true
	if (value.length > LIMITS.website) return false
	try {
		const url = new URL(value.trim())
		return (
			(url.protocol === 'https:' || url.protocol === 'http:') &&
			!url.username &&
			!url.password &&
			url.href.length <= LIMITS.website
		)
	} catch {
		return false
	}
}

function findInvalidField(values: Record<FieldName, string>): FieldName | null {
	const username = values.username.trim()
	if (!username || username.length > LIMITS.username) return 'username'
	const email = values.email.trim()
	if (email.length > LIMITS.email || !validator.validate(email)) return 'email'
	if (!isValidWebsite(values.website)) return 'website'
	if (!values.content.trim() || values.content.length > LIMITS.content) {
		return 'content'
	}
	return null
}

async function readServerFieldError(res: Response): Promise<FieldName | null> {
	if (res.status === 413) return 'content'
	if (res.status !== 400) return null
	const body: unknown = await res.json().catch(() => null)
	const message =
		body && typeof body === 'object' && 'error' in body ? body.error : null
	return typeof message === 'string'
		? SERVER_FIELD_ERRORS.get(message) ?? null
		: null
}

export default function CommentForm({
	quote,
	replyTo,
	onCancelReply,
	onSubmitted,
	dict,
}: CommentFormProps) {
	const formRef = useRef<CommentFormElement>(null)
	const turnstileRef = useRef<TurnstileInstance>(null)
	const turnstileContainerRef = useRef<HTMLDivElement>(null)
	const lastQuoteRef = useRef('')
	const [fieldError, setFieldError] = useState<FieldName | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [turnstileSize, setTurnstileSize] =
		useState<ResponsiveTurnstileSize>('compact')
	const { resolvedTheme } = useTheme()
	const turnstileTheme =
		resolvedTheme === 'dark' || resolvedTheme === 'light'
			? resolvedTheme
			: 'auto'

	const fieldMessages: Record<FieldName, string> = {
		username: dict.InvalidName,
		email: dict.InvalidEmail,
		website: dict.InvalidWebsite,
		content: dict.InvalidContent,
	}

	const showFieldError = (field: FieldName) => {
		setFieldError(field)
		formRef.current?.elements[field].focus()
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!formRef.current || isSubmitting) {
			return
		}

		const form = formRef.current
		const formData = new FormData(form)
		const username = String(formData.get('username') ?? '')
		const email = String(formData.get('email') ?? '')
		const website = String(formData.get('website') ?? '')
		const content = String(formData.get('content') ?? '')
		const token = formData.get('cf-turnstile-response') as string

		const invalidField = findInvalidField({ username, email, website, content })
		if (invalidField) {
			showFieldError(invalidField)
			return
		}
		setFieldError(null)
		setIsSubmitting(true)

		try {
			const res = await fetch('/api/comInsert', {
				method: 'POST',
				body: JSON.stringify({
					username,
					email,
					website,
					content,
					token,
					parent_comment_id: replyTo?.id ?? null,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
				signal: AbortSignal.timeout(15_000),
			})

			if (res.ok) {
				alert(dict.CommentAccepted)
				form.reset()
				lastQuoteRef.current = ''
				turnstileRef.current?.reset()
				onSubmitted()
			} else if (res.status === 403) {
				alert(dict.PleaseVerify)
				turnstileRef.current?.reset()
			} else {
				const serverField = await readServerFieldError(res)
				if (serverField) {
					showFieldError(serverField)
				} else {
					alert(dict.CommentError)
				}
				turnstileRef.current?.reset()
			}
		} catch (error) {
			console.error('Submitting comment failed:', error)
			alert(dict.CommentError)
			turnstileRef.current?.reset()
		} finally {
			setIsSubmitting(false)
		}
	}

	const cancelReply = () => {
		const textarea = formRef.current?.elements.content
		const previous = lastQuoteRef.current
		if (textarea && previous && textarea.value.startsWith(previous)) {
			textarea.value = textarea.value.slice(previous.length)
		}
		lastQuoteRef.current = ''
		onCancelReply()
		textarea?.focus()
	}

	// Put the quote in front of the draft, replacing the previous quote if it is
	// still in place, and bring the textarea into view.
	useEffect(() => {
		const textarea = formRef.current?.elements.content
		if (!textarea || !quote.text) return

		const previous = lastQuoteRef.current
		const draft =
			previous && textarea.value.startsWith(previous)
				? textarea.value.slice(previous.length)
				: textarea.value
		textarea.value = quote.text + draft
		lastQuoteRef.current = quote.text
		textarea.focus({ preventScroll: true })
		textarea.scrollIntoView({ block: 'center' })
	}, [quote])

	useEffect(() => {
		const container = turnstileContainerRef.current
		if (!container) return

		const updateSize = (width: number) => {
			const nextSize: ResponsiveTurnstileSize =
				width >= TURNSTILE_FLEXIBLE_MIN_WIDTH ? 'flexible' : 'compact'
			setTurnstileSize((currentSize) =>
				currentSize === nextSize ? currentSize : nextSize
			)
		}

		const updateFromContainer = () => {
			updateSize(container.getBoundingClientRect().width)
		}

		updateFromContainer()
		const animationFrameId = window.requestAnimationFrame(updateFromContainer)
		const observer =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(([entry]) => {
					if (entry) updateSize(entry.contentRect.width)
				})
		observer?.observe(container)
		window.addEventListener('resize', updateFromContainer)

		return () => {
			window.cancelAnimationFrame(animationFrameId)
			observer?.disconnect()
			window.removeEventListener('resize', updateFromContainer)
		}
	}, [])

	const errorProps = (field: FieldName) =>
		fieldError === field
			? { 'aria-invalid': true, 'aria-describedby': `${field}-error` }
			: {}

	const errorMessage = (field: FieldName) =>
		fieldError === field && (
			<p
				id={`${field}-error`}
				role="alert"
				className="mt-1 text-sm text-red-700 dark:text-red-400"
			>
				{fieldMessages[field]}
			</p>
		)

	return (
		<>
			<form
				ref={formRef}
				onSubmit={handleSubmit}
				className="bg-site-surface text-site-copy shadow-md rounded border border-site-line px-4 sm:px-8 pt-6 pb-8 mb-4"
			>
				<div className="mb-4">
					<label
						htmlFor="username"
						className="block text-site-heading text-sm font-bold mb-2"
					>
						{dict.YourName}
					</label>
					<input
						type="text"
						id="username"
						name="username"
						placeholder={dict.NamePlaceholder}
						required
						maxLength={LIMITS.username}
						autoComplete="name"
						{...errorProps('username')}
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
					{errorMessage('username')}
				</div>
				<div className="mb-4">
					<label
						htmlFor="email"
						className="block text-site-heading text-sm font-bold mb-2"
					>
						{dict.Email}
					</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder={dict.EmailPlaceholder}
						required
						maxLength={LIMITS.email}
						autoComplete="email"
						{...errorProps('email')}
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
					{errorMessage('email')}
				</div>
				<div className="mb-4">
					<label
						htmlFor="website"
						className="block text-site-heading text-sm font-bold mb-2"
					>
						{dict.Website}
					</label>
					<input
						type="url"
						id="website"
						name="website"
						placeholder="https://"
						maxLength={LIMITS.website}
						autoComplete="url"
						{...errorProps('website')}
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
					{errorMessage('website')}
				</div>
				<div className="mb-4">
					<label
						htmlFor="content"
						className="block text-site-heading text-sm font-bold mb-2"
					>
						{dict.YourComment}
					</label>
					{replyTo && (
						<p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm text-site-muted">
							<span>
								{dict.ReplyingTo.replace('{name}', () => replyTo.username)}
							</span>
							<button
								type="button"
								onClick={cancelReply}
								className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
							>
								{dict.CancelReply}
							</button>
						</p>
					)}
					<textarea
						id="content"
						name="content"
						placeholder={dict.CommentPlaceholder}
						required
						maxLength={LIMITS.content}
						{...errorProps('content')}
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface h-32"
					/>
					{errorMessage('content')}
					<p className="text-site-muted text-xs mt-1">
						{dict.MarkdownTip}
					</p>
				</div>
				<div
					ref={turnstileContainerRef}
					className="mb-4 -mx-1 w-[calc(100%+0.5rem)] min-w-0 sm:mx-0 sm:w-full"
					data-turnstile-size={turnstileSize}
				>
					<Turnstile
						siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
						ref={turnstileRef}
						className="mx-auto max-w-full"
						options={{
							action: 'comment',
							appearance: 'always',
							execution: 'render',
							size: turnstileSize,
							theme: turnstileTheme,
						}}
					/>
				</div>
				<button
					type="submit"
					disabled={isSubmitting}
					aria-busy={isSubmitting}
					className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-[#f4f4f5] font-bold py-2 px-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
				>
					{isSubmitting ? dict.Submitting : dict.Submit}
				</button>
			</form>
		</>
	)
}
