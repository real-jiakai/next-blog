import { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

export default function AISummary({ contentMarkdown, params, tags }) {
	const [summary, setSummary] = useState('')
	const [isCopied, setIsCopied] = useState(false)
	const [isFetching, setIsFetching] = useState(false)
	const [selectedAI, setSelectedAI] = useState('claude')
	const formattedTags = tags.map(tag => `#${tag}`).join(', ')

	useEffect(() => {
		// 每次 selectedAI 改变时，重置 summary
		setSummary('')
		setIsCopied(false)
	}, [selectedAI])

	const fetchSummary = () => {
		setIsFetching(true)
		let truncatedContentMarkdown = contentMarkdown.slice(0, 3000)
		truncatedContentMarkdown = truncatedContentMarkdown.replace(/"/g, '\\"') // 对双引号进行转义
		const message = `using Chinese to summary this article. Below is the article content: \n"${truncatedContentMarkdown}". \nPlease summary this article within 50 chinese words.`
		fetch(`/api/${selectedAI}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: message,
			}),
		})
			.then(response => response.json())
			.then(data => {
				setSummary(data.summary) // 假设 API 直接返回 summary 字段
				setIsFetching(false)
			})
			.catch(error => {
				console.error('Error fetching summary:', error)
				setIsFetching(false)
			})
	}

	const copyText = `标签：${formattedTags}\n总结: ${summary}\nvia: ${process.env.NEXT_PUBLIC_SITE_URL}/${params.year}/${params.month}/${params.slug}`

	return (
		<div className="border border-gray-300 rounded mb-4 relative">
			<div className="font-bold mb-2 text-center">文章摘要生成器</div>
      
			{/* 下拉框选择AI */}
			<div className="mb-4 text-center">
				<select
					id="ai-selector"
					name="ai-selector"
					className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm bg-white dark:bg-gray-800 dark:text-white"
					value={selectedAI}
					onChange={(e) => setSelectedAI(e.target.value)}
				>
					<option value="claude">Claude</option>
					<option value="gemini">Gemini</option>
					<option value="chatgpt">ChatGPT</option>
					<option value="mistralai">Mistral AI</option>
				</select>
			</div>

			{/* 摘要和复制按钮 */}
			{summary && (
				<div className='bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border'>
					<p className="break-words max-w-full">标签：{formattedTags}</p>
					<p className="break-words max-w-full">总结: {summary}</p>
					<p className="break-words max-w-full">via: {process.env.NEXT_PUBLIC_SITE_URL}/{params.year}/{params.month}/{params.slug}</p>
				</div>
			)}

			<div className="flex justify-center items-center mt-4">
				{isFetching ? (
					<p className="text-sm">正在生成摘要，请稍候...</p>
				) : (
					summary ? (
						<CopyToClipboard text={copyText} onCopy={() => setIsCopied(true)}>
							<button className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded">
								{isCopied ? '已复制' : '复制摘要'}
							</button>
						</CopyToClipboard>
					) : (
						<button
							className="bg-black hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded"
							onClick={fetchSummary}
						>
              生成摘要
						</button>
					)
				)}
			</div>
		</div>
	)
}
