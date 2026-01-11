'use client'

import { useRef, useEffect, useState, FormEvent } from 'react'
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'
import validator from 'email-validator'

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
	const [emailError, setEmailError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setIsSubmitting(true)

		if (!formRef.current) return

		const formData = new FormData(formRef.current)
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
		})

		if (res.status === 200) {
			alert(dict.CommentAccepted)
			formRef.current.reset()
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
		setIsSubmitting(false)
	}

	useEffect(() => {
		if (formRef.current) {
			formRef.current.elements.content.value = quote
		}
	}, [quote])

	return (
		<>
			<form
				ref={formRef}
				onSubmit={handleSubmit}
				className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 dark:bg-gray-600 dark:text-white"
			>
				<div className="mb-4">
					<label
						htmlFor="username"
						className="block text-gray-700 text-sm font-bold mb-2 dark:text-white"
					>
						{dict.YourName}
					</label>
					<input
						type="text"
						id="username"
						name="username"
						placeholder="NickName"
						required
						className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:text-white"
					/>
				</div>
				<div className="mb-4">
					<label
						htmlFor="email"
						className="block text-gray-700 text-sm font-bold mb-2 dark:text-white"
					>
						{dict.Email}
					</label>
					<input
						type="email"
						id="email"
						name="email"
						placeholder="E-Mail"
						required
						className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:text-white"
					/>
					{emailError && <p className="text-red-500 text-xs italic">{emailError}</p>}
				</div>
				<div className="mb-4">
					<label
						htmlFor="website"
						className="block text-gray-700 text-sm font-bold mb-2 dark:text-white"
					>
						{dict.Website}
					</label>
					<input
						type="url"
						id="website"
						name="website"
						placeholder="Website"
						className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:text-white"
					/>
				</div>
				<div className="mb-4">
					<label
						htmlFor="content"
						className="block text-gray-700 text-sm font-bold mb-2 dark:text-white"
					>
						{dict.YourComment}
					</label>
					<textarea
						id="content"
						name="content"
						placeholder={dict.CommentPlaceholder}
						required
						className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 dark:text-white"
					/>
				</div>
				<div className="mb-4">
					<Turnstile
						siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!}
						ref={turnstileRef}
					/>
				</div>
				<button
					type="submit"
					disabled={isSubmitting}
					className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
				>
					{isSubmitting ? dict.Submitting : dict.Submit}
				</button>
			</form>
		</>
	)
}
