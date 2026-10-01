'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Identicon from 'identicon.js'
import MD5 from 'crypto-js/md5'
import Date from '@/components/Date'
import type { Locale } from '@/lib/i18n-config'

interface Comment {
	id: number
	username: string
	content: string
	created_at: string
}

export interface CommentListDict {
	Says: string
	Quote: string
	QuoteLabel: string
	PermalinkLabel: string
	NoComments: string
	LoadingComments: string
	CommentsUnavailable: string
	LoadEarlier: string
}

interface CommentListProps {
	quoteComment: (comment: Comment, id: number) => void
	updateList: boolean
	dict: CommentListDict
	lang: Locale
}

// 生成头像
const generateIdenticon = (username: string): string => {
	const hash = MD5(username).toString()
	const data = new Identicon(hash, { size: 64, format: 'svg' }).toString()
	return `data:image/svg+xml;base64,${data}`
}

const fillLabel = (template: string, values: Record<string, string | number>) =>
	template.replace(/\{(\w+)\}/g, (match, key: string) =>
		Object.hasOwn(values, key) ? String(values[key]) : match
	)

async function fetchCommentPage(page: number) {
	const res = await fetch(
		page > 1 ? `/api/comSelect?page=${page}` : '/api/comSelect'
	)
	if (!res.ok) {
		throw new Error(`HTTP error! status: ${res.status}`)
	}
	const data: unknown = await res.json()
	return {
		comments: Array.isArray(data) ? (data as Comment[]) : [],
		hasMore: res.headers.get('X-Comment-Has-More') === 'true',
	}
}

export default function CommentList({ quoteComment, updateList, dict, lang }: CommentListProps) {
	const [comments, setComments] = useState<Comment[]>([])
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [loadingEarlier, setLoadingEarlier] = useState(false)
	const hashHandled = useRef(false)

	useEffect(() => {
		// Fetch inside the effect and ignore the result if the component
		// unmounts or `updateList` changes before it resolves. setState only ever
		// runs in the async callback (never synchronously in the effect body).
		let active = true

		async function fetchComments() {
			try {
				const result = await fetchCommentPage(1)
				if (active) {
					setComments(result.comments)
					setPage(1)
					setHasMore(result.hasMore)
					setStatus('ready')
				}
			} catch (error) {
				console.error('Fetching comments failed: ', error)
				if (active) setStatus('error')
			}
		}

		fetchComments()

		return () => {
			active = false
		}
	}, [updateList])

	// Comments arrive after hydration, too late for the browser's own jump to a
	// #comment-N fragment, so scroll to it once after the first load.
	useEffect(() => {
		if (hashHandled.current || comments.length === 0) return
		hashHandled.current = true
		const id = window.location.hash.slice(1)
		if (/^comment-\d+$/.test(id)) {
			document.getElementById(id)?.scrollIntoView()
		}
	}, [comments])

	const loadEarlier = async () => {
		if (loadingEarlier) return
		setLoadingEarlier(true)
		try {
			const result = await fetchCommentPage(page + 1)
			setComments((previous) => [
				...result.comments.filter(
					(comment) => !previous.some((shown) => shown.id === comment.id)
				),
				...previous,
			])
			setPage(page + 1)
			setHasMore(result.hasMore)
		} catch (error) {
			console.error('Fetching earlier comments failed: ', error)
		} finally {
			setLoadingEarlier(false)
		}
	}

	const emptyMessage =
		status === 'loading'
			? dict.LoadingComments
			: status === 'error'
				? dict.CommentsUnavailable
				: dict.NoComments

	return (
		<>
			{comments.length > 0 ? (
				<div className="comment-list space-y-4">
					{hasMore && (
						<button
							type="button"
							onClick={loadEarlier}
							disabled={loadingEarlier}
							aria-busy={loadingEarlier}
							className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						>
							{dict.LoadEarlier}
						</button>
					)}
					{comments.map((comment) => (
						<div
							key={comment.id}
							id={`comment-${comment.id}`}
							className="comment scroll-mt-24 p-4 bg-site-surface border border-site-line shadow-md rounded-lg flex flex-col"
						>
							<div className="flex justify-between items-center mb-2 border-b border-site-line">
								<div className="flex items-center space-x-2">
									<Image
										src={generateIdenticon(comment.username)}
										alt=""
										width={32}
										height={32}
										className="rounded-full"
									/>
									<h3 className="font-bold text-lg">{comment.username}</h3>
									<span>{dict.Says}</span>
								</div>
							</div>
							<div className="flex-1 flex flex-col">
								<div className="flex-1">
									<div
										className="comment-content"
										dangerouslySetInnerHTML={{ __html: comment.content }}
									></div>
								</div>
								<div className="flex justify-end items-center space-x-2">
									<small>
										<Date
											dateString={comment.created_at}
											format={lang === 'zh' ? 'YYYY-M-D HH:mm' : 'h:mm A M/D/YYYY'}
											locale={lang}
										/>
									</small>
									<a
										href={`#comment-${comment.id}`}
										aria-label={fillLabel(dict.PermalinkLabel, {
											name: comment.username,
											id: comment.id,
										})}
										className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
									>
										#
									</a>
									<button
										type="button"
										aria-label={fillLabel(dict.QuoteLabel, { name: comment.username })}
										className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
										onClick={() => quoteComment(comment, comment.id)}
									>
										{dict.Quote}
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-gray-700 dark:text-gray-300">{emptyMessage}</p>
			)}
		</>
	)
}
