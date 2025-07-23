import React, { useState, useEffect, useMemo, useCallback } from 'react'

export default function AISummary({ contentMarkdown, params, tags }) {
	const [summary, setSummary] = useState('')
	const [isFetching, setIsFetching] = useState(false)
	const [selectedAI, setSelectedAI] = useState('gemini')
	const [error, setError] = useState('')

	const formattedTags = useMemo(() => tags.map(tag => `#${tag}`).join(', '), [tags])

	const extractThemeContent = useCallback((content) => {
		const themeStart = content.indexOf('## 话题')
		const possibleEnds = ['## 有趣', '## 链享', '##言论']
		const themeEnd = possibleEnds.reduce((minIndex, endMark) => {
			const index = content.indexOf(endMark)
			return (index !== -1 && (index < minIndex || minIndex === -1)) ? index : minIndex
		}, -1)
		
		if (themeStart !== -1 && themeEnd !== -1) {
			return content.slice(themeStart, themeEnd).trim()
		}
		return ''
	}, [])

	useEffect(() => {
		setSummary('')
		setError('')
	}, [selectedAI])

	const fetchSummary = useCallback(() => {
		setIsFetching(true)
		setError('')
		setSummary('')
		const themeContent = extractThemeContent(contentMarkdown)
		const message = `请用中文总结以下话题内容。总结控制在50个中文汉字以内：\n\n${themeContent}`

		fetch(`/api/${selectedAI}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message }),
		}).then(response => {
			const reader = response.body.getReader()
			const decoder = new TextDecoder()

			function readStream() {
				reader.read().then(({ done, value }) => {
					if (done) {
						setIsFetching(false)
						return
					}

					const chunk = decoder.decode(value)
					const lines = chunk.split('\n\n')
					lines.forEach(line => {
						if (line.startsWith('data: ')) {
							const content = line.slice(6).trim()
							try {
								const data = JSON.parse(content)
								if (data.content) {
									setSummary(prev => prev + data.content)
								}
							} catch (error) {
								console.error('Error parsing JSON:', error)
							}
						}
					})

					readStream()
				})
			}

			readStream()
		}).catch(error => {
			console.error('Error fetching summary:', error)
			setError('获取摘要时出错，请稍后重试。')
			setIsFetching(false)
		})
	}, [selectedAI, contentMarkdown, extractThemeContent])


	return (
		<div className="border border-gray-300 dark:border-slate-600 rounded mb-4 relative">
			<div className="font-bold mb-2 text-center text-gray-900 dark:text-gray-100">文章摘要生成器</div>
      
			<div className="mb-4 text-center">
				<select
					id="ai-selector"
					name="ai-selector"
					className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white dark:bg-slate-700 dark:text-white"
					value={selectedAI}
					onChange={(e) => setSelectedAI(e.target.value)}
					aria-label="选择 AI 模型"
				>
					<option value="gemini">Gemini-2.5-Flash-Lite</option>
					<option value="deepseek">DeepSeek-V3</option>
				</select>
			</div>

			{summary && (
				<div className='bg-white dark:bg-slate-700 rounded-xl shadow-md p-4 hover:bg-gray-100 dark:hover:bg-slate-600 transition cursor-copy border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white'>
					<p className="break-words max-w-full">标签：{formattedTags}</p>
					<p className="break-words max-w-full">总结: {summary}</p>
					<p className="break-words max-w-full">via: {process.env.NEXT_PUBLIC_SITE_URL}/{params.year}/{params.month}/{params.slug}</p>
				</div>
			)}

			{error && <div className="text-red-500 text-center mb-2">{error}</div>}

			<div className="flex justify-center items-center mt-4">
				{!isFetching && !summary && (
					<button
						className="bg-black hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded"
						onClick={fetchSummary}
						disabled={isFetching}
						aria-label="生成摘要"
					>
						生成摘要
					</button>
				)}
			</div>
		</div>
	)
}