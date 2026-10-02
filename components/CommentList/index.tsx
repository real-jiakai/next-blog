'use client'

import { useState, useEffect, useRef } from 'react'
import Date from '@/components/Date'
import type { Locale } from '@/lib/i18n-config'

interface Comment {
	id: number
	username: string
	website: string | null
	avatar: string
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

// The API already validates websites; this only keeps a link to http(s).
const isWebUrl = (value: unknown): value is string => {
	if (typeof value !== 'string') return false
	try {
		const { protocol } = new URL(value)
		return protocol === 'https:' || protocol === 'http:'
	} catch {
		return false
	}
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
	const [earlierFailed, setEarlierFailed] = useState(false)
	const hashHandled = useRef(false)
	const listRef = useRef<HTMLDivElement>(null)
	const focusFirstComment = useRef(false)

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
					setEarlierFailed(false)
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

	// The button unmounts with the last page, so hand its focus to the first
	// comment rather than let it fall back to <body>.
	useEffect(() => {
		if (!focusFirstComment.current) return
		focusFirstComment.current = false
		listRef.current?.querySelector<HTMLElement>('.comment')?.focus()
	}, [comments, hasMore])

	const loadEarlier = async () => {
		if (loadingEarlier) return
		setLoadingEarlier(true)
		setEarlierFailed(false)
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
			if (!result.hasMore) focusFirstComment.current = true
		} catch (error) {
			console.error('Fetching earlier comments failed: ', error)
			setEarlierFailed(true)
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
				<div ref={listRef} className="comment-list space-y-4">
					{hasMore && (
						<div>
							{/* aria-disabled, not disabled: a disabled button drops the
							    keyboard focus it holds. loadEarlier ignores repeat presses. */}
							<button
								type="button"
								onClick={loadEarlier}
								aria-disabled={loadingEarlier}
								aria-busy={loadingEarlier}
								className="text-site-muted underline underline-offset-4 transition-colors hover:text-site-accent"
							>
								{dict.LoadEarlier}
							</button>
							{earlierFailed && (
								<p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
									{dict.CommentsUnavailable}
								</p>
							)}
						</div>
					)}
					{comments.map((comment) => (
						<div
							key={comment.id}
							id={`comment-${comment.id}`}
							tabIndex={-1}
							className="comment scroll-mt-24 flex flex-col border-t border-site-line pt-4"
						>
							<div className="flex justify-between items-center mb-2 border-b border-site-line">
								<div className="flex items-center space-x-2">
									{comment.avatar && (
										// A server-made data: URI; there is nothing to optimize.
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={comment.avatar}
											alt=""
											width={32}
											height={32}
											decoding="async"
											className="rounded-full"
										/>
									)}
									<h3 className="m-0 py-3 text-lg font-bold text-site-heading">
										{isWebUrl(comment.website) ? (
											<a
												href={comment.website}
												target="_blank"
												rel="ugc nofollow noopener noreferrer"
												className="underline decoration-site-accent/60 underline-offset-4 transition-colors hover:text-site-accent hover:decoration-site-accent"
											>
												{comment.username}
											</a>
										) : (
											comment.username
										)}
									</h3>
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
										className="text-site-muted transition-colors hover:text-site-accent"
									>
										#
									</a>
									<button
										type="button"
										aria-label={fillLabel(dict.QuoteLabel, { name: comment.username })}
										className="text-site-muted transition-colors hover:text-site-accent"
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
				<p className="m-0 text-site-muted">{emptyMessage}</p>
			)}
		</>
	)
}
