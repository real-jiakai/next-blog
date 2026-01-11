'use client'

import { useState } from 'react'
import CommentForm from '@/components/CommentForm'
import CommentList from '@/components/CommentList'

interface CommentDict {
  Comments: string
  LeaveComment: string
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

interface CommentData {
  username: string
  content: string
}

interface CommentProps {
  dict: CommentDict
  lang: string
}

export default function Comment({ dict, lang }: CommentProps) {
	const [quote, setQuote] = useState('')
	const [updateList, setUpdateList] = useState(false)
	const [parentCommentId, setParentCommentId] = useState<number | null>(null)

	const quotePrefix = lang === 'zh' ? '引用' : 'Quoting '
	const quoteSuffix = lang === 'zh' ? '的发言:' : "'s comment:"

	const quoteComment = (comment: CommentData, commentId: number) => {
		const refinedContent = comment.content.replace(
			/<blockquote>[\s\S]*?<\/blockquote>/,
			''
		)

		setQuote(
			`<blockquote><pre>${quotePrefix}${comment.username}${quoteSuffix}</pre><p>${refinedContent}</p></blockquote><br/>\n`
		)
		setParentCommentId(commentId)
	}

	return (
		<>
			<h2 className="text-3xl font-bold mt-8 mb-4">{dict.Comments}</h2>
			<CommentList quoteComment={quoteComment} updateList={updateList} />
			<h2 className="text-3xl font-bold mt-8 mb-4">{dict.LeaveComment}</h2>
			<CommentForm
				quote={quote}
				setQuote={setQuote}
				setUpdateList={setUpdateList}
				parentCommentId={parentCommentId}
				setParentCommentId={setParentCommentId}
				dict={dict}
			/>
		</>
	)
}
