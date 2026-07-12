'use client'

import { useRef, useEffect, useState, FormEvent } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import validator from 'email-validator'

const TURNSTILE_FLEXIBLE_MIN_WIDTH = 300
type ResponsiveTurnstileSize = 'compact' | 'flexible'

interface CommentDict {
  YourName: string
  Email: string
  Website: string
  YourComment: string
  CommentPlaceholder: string
  Submit: string
  Submitting: string
  InvalidEmail: string
  CommentAccepted: string
  PleaseVerify: string
  CommentError: string
  MarkdownTip: string
}

interface CommentFormProps {
  quote: string
  setQuote: (quote: string) => void
  setUpdateList: (updater: (prev: boolean) => boolean) => void
  parentCommentId: number | null
  setParentCommentId: (id: number | null) => void
  dict: CommentDict
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

export default function CommentForm({
	quote,
	setQuote,
	setUpdateList,
	parentCommentId,
	setParentCommentId,
	dict,
}: CommentFormProps) {
	const formRef = useRef<CommentFormElement>(null)
	const turnstileRef = useRef<TurnstileInstance>(null)
	const turnstileContainerRef = useRef<HTMLDivElement>(null)
	const [emailError, setEmailError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [turnstileSize, setTurnstileSize] =
		useState<ResponsiveTurnstileSize>('compact')

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!formRef.current || isSubmitting) {
			return
		}

		const form = formRef.current
		setIsSubmitting(true)

		const formData = new FormData(form)
		const username = formData.get('username') as string
		const email = formData.get('email') as string
		const website = formData.get('website') as string
		const content = formData.get('content') as string
		const token = formData.get('cf-turnstile-response') as string

		if (!validator.validate(email)) {
			setEmailError(dict.InvalidEmail)
			setIsSubmitting(false)
			return
		} else {
			setEmailError('')
		}

		try {
			const res = await fetch('/api/comInsert', {
				method: 'POST',
				body: JSON.stringify({
					username,
					email,
					website,
					content,
					token,
					parent_comment_id: parentCommentId,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
				signal: AbortSignal.timeout(15_000),
			})

			if (res.ok) {
				alert(dict.CommentAccepted)
				form.reset()
				turnstileRef.current?.reset()
				setQuote('')
				setUpdateList((prev) => !prev)
				setParentCommentId(null)
			} else if (res.status === 403) {
				alert(dict.PleaseVerify)
				turnstileRef.current?.reset()
			} else {
				alert(dict.CommentError)
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

	useEffect(() => {
		if (formRef.current) {
			formRef.current.elements.content.value = quote
		}
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
						placeholder="NickName"
						required
						autoComplete="name"
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
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
						placeholder="E-Mail"
						required
						autoComplete="email"
						aria-invalid={emailError ? 'true' : undefined}
						aria-describedby={emailError ? 'email-error' : undefined}
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
					{emailError && (
						<p id="email-error" role="alert" className="text-red-500 text-xs italic">
							{emailError}
						</p>
					)}
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
						placeholder="Website"
						autoComplete="url"
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
					/>
				</div>
				<div className="mb-4">
					<label
						htmlFor="content"
						className="block text-site-heading text-sm font-bold mb-2"
					>
						{dict.YourComment}
					</label>
					<textarea
						id="content"
						name="content"
						placeholder={dict.CommentPlaceholder}
						required
						className="shadow appearance-none border border-site-line bg-site-surface-muted rounded w-full py-2 px-3 text-site-copy placeholder:text-site-muted leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface h-32"
					/>
					<p className="text-site-muted text-xs mt-1">
						{dict.MarkdownTip}
					</p>
				</div>
				<div
					ref={turnstileContainerRef}
					className="mb-4 w-full min-w-0"
					data-turnstile-size={turnstileSize}
				>
					<Turnstile
						siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
						ref={turnstileRef}
						className="mx-auto max-w-full"
						options={{
							action: 'comment',
							appearance: 'interaction-only',
							execution: 'render',
							size: turnstileSize,
							theme: 'auto',
						}}
					/>
				</div>
				<button
					type="submit"
					disabled={isSubmitting}
					aria-busy={isSubmitting}
					className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-[#f4f4f5] font-bold py-2 px-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
				>
					{isSubmitting ? dict.Submitting : dict.Submit}
				</button>
			</form>
		</>
	)
}
