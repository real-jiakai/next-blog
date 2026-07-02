'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Identicon from 'identicon.js'
import CryptoJS from 'crypto-js'
import Date from '@/components/Date'

interface Comment {
  id: number
  username: string
  content: string
  created_at: string
  url: string
}

interface CommentListDict {
  Says: string
  Quote: string
  NoComments: string
}

interface CommentListProps {
  quoteComment: (comment: Comment, id: number) => void
  updateList: boolean
  dict: CommentListDict
}

// 生成头像
const generateIdenticon = (username: string): string => {
	const hash = CryptoJS.MD5(username).toString()
	const data = new Identicon(hash, { size: 64, format: 'svg' }).toString()
	return `data:image/svg+xml;base64,${data}`
}

export default function CommentList({ quoteComment, updateList, dict }: CommentListProps) {
	const [comments, setComments] = useState<Comment[]>([])

	useEffect(() => {
		// Fetch inside the effect and ignore the result if the component
		// unmounts or `updateList` changes before it resolves. setState only ever
		// runs in the async callback (never synchronously in the effect body).
		let active = true

		async function fetchComments() {
			try {
				const res = await fetch('/api/comSelect')
				if (!res.ok) {
					throw new Error(`HTTP error! status: ${res.status}`)
				}
				const data = await res.json()
				if (active) {
					setComments(data)
				}
			} catch (error) {
				console.error('Fetching comments failed: ', error)
			}
		}

		fetchComments()

		return () => {
			active = false
		}
	}, [updateList])

	return (
		<>
			{comments.length > 0 ? (
				<div className="comment-list space-y-4">
					{comments.map((comment) => (
						<div
							key={comment.id}
							id={`comment-${comment.id}`}
							className="comment p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col"
						>
							<div className="flex justify-between items-center mb-2 border-b border-gray-30">
								<div className="flex items-center space-x-2">
									<Image
										src={generateIdenticon(comment.username)}
										alt={`${comment.username}'s Identicon`}
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
										<Date dateString={comment.created_at} format="h:mm A M/D/YYYY" />
									</small>
									<Link
										href={`${comment.url}#comment-${comment.id}`}
										className="text-blue-500 hover:text-blue-700"
									>
                    #
									</Link>
									<button
										className="text-blue-500 hover:text-blue-700"
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
				<p className="text-gray-700 dark:text-gray-300">{dict.NoComments}</p>
			)}
		</>
	)
}
