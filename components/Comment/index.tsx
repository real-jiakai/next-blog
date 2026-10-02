'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type {
	CommentFormDict,
	CommentQuote,
	ReplyTarget,
} from '@/components/CommentForm'
import type { CommentListDict } from '@/components/CommentList'
import type { Locale } from '@/lib/i18n-config'
import { buildQuote } from '@/lib/commentQuote'

// Split out of the post page's own chunks, so a build with comments disabled
// never downloads the comment list, the form or Turnstile.
const CommentList = dynamic(() => import('@/components/CommentList'), {
	ssr: false,
	loading: () => (
		<div
			className="h-24 animate-pulse rounded bg-site-surface-muted"
			aria-hidden="true"
		/>
	),
})
const CommentForm = dynamic(() => import('@/components/CommentForm'), {
	ssr: false,
	loading: () => (
		<div
			className="h-96 animate-pulse rounded bg-site-surface-muted"
			aria-hidden="true"
		/>
	),
})

type CommentDict = CommentFormDict &
	CommentListDict & {
		Comments: string
		LeaveComment: string
	}

interface CommentData {
	username: string
	content: string
}

interface CommentProps {
	dict: CommentDict
	lang: Locale
}

// Drop the quoted comment's own Quote header block (a leading blockquote that
// opens with a text-only <pre>) and the <br> older quotes left after it, so
// quotes do not nest. Its other citations are kept.
function stripLeadingQuote(html: string): string {
	const body = new DOMParser().parseFromString(html, 'text/html').body
	const first = [...body.childNodes].find(
		(node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim()
	)
	if (first instanceof Element && first.tagName === 'BLOCKQUOTE') {
		const header = first.firstElementChild
		if (header?.tagName === 'PRE' && header.childElementCount === 0) {
			const next = first.nextElementSibling
			first.remove()
			if (next?.tagName === 'BR') next.remove()
		}
	}
	return body.innerHTML.trim()
}

export default function Comment({ dict, lang }: CommentProps) {
	const [quote, setQuote] = useState<CommentQuote>({ text: '', n: 0 })
	const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
	const [updateList, setUpdateList] = useState(false)

	const quoteComment = (comment: CommentData, commentId: number) => {
		const text = buildQuote(comment.username, stripLeadingQuote(comment.content), lang)

		setQuote((previous) => ({ text, n: previous.n + 1 }))
		setReplyTo({ id: commentId, username: comment.username })
	}

	return (
		<>
			<h2 className="text-3xl font-bold mt-8 mb-4">{dict.Comments}</h2>
			<CommentList
				quoteComment={quoteComment}
				updateList={updateList}
				dict={dict}
				lang={lang}
			/>
			<h2 className="text-3xl font-bold mt-8 mb-4">{dict.LeaveComment}</h2>
			<CommentForm
				quote={quote}
				replyTo={replyTo}
				onCancelReply={() => setReplyTo(null)}
				onSubmitted={() => {
					setReplyTo(null)
					setUpdateList((prev) => !prev)
				}}
				dict={dict}
			/>
		</>
	)
}
