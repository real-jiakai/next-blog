import { useState, useEffect } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// AI总结组件
export default function AISummary({ contentMarkdown, params, tags }) {
	const [showCopyButton, setShowCopyButton] = useState(false)
	const [summary, setSummary] = useState(null)
	const formattedTags = tags.map(tag => `#${tag}`).join(', ')
	const [isCopied, setIsCopied] = useState(false)
	const [isFetching, setIsFetching] = useState(false)
	const [selectedTab, setSelectedTab] = useState('gemini')
    
	useEffect(() => {
		setSummary(null)
		setIsCopied(false)
		setShowCopyButton(false)
	}, [selectedTab])

	const fetchSummary = () => {
		setIsFetching(true)
		let truncatedContentMarkdown = contentMarkdown.slice(0, 3000)
		truncatedContentMarkdown = truncatedContentMarkdown.replace(/"/g, '\\"') // 对双引号进行转义
		const message = `using Chinese to summary this article. Below is the article content: \n
				"${truncatedContentMarkdown}". \n
				Please summary this article within 50 chinese words.`
		fetch(`/api/${selectedTab}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: message,
			}),
		})
			.then((response) => response.json())
			.then(data => {
				selectedTab === 'gemini' ? setSummary(`${data.text}`) : setSummary(`${data.gptResponse}`)
				setIsFetching(false)
				setShowCopyButton(true)
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
			<div className="flex justify-between mb-4 space-x-2"> {/* 添加space-x-2来控制按钮之间的间隙 */}
				<button
					className={`px-4 py-2 text-sm font-medium leading-5 rounded-md transition-colors duration-150 ${
						selectedTab === 'gemini' ? 'bg-blue-500 text-white' : 'text-blue-500 border border-blue-500'
					}`}
					onClick={() => setSelectedTab('gemini')}
				>
                    Gemini
				</button>
				<button
					className={`px-4 py-2 text-sm font-medium leading-5 rounded-md transition-colors duration-150 ${
						selectedTab === 'chatgpt' ? 'bg-blue-500 text-white' : 'text-blue-500 border border-blue-500'
					}`}
					onClick={() => setSelectedTab('chatgpt')}
				>
                    ChatGPT
				</button>
			</div>

			<>
				{summary ? (
					<div className='bg-white rounded-xl shadow-md p-4 hover:bg-gray-100 transition cursor-copy border'>
						<p className="break-words max-w-full">标签：{formattedTags}</p>
						<p className="break-words max-w-full">总结: {summary}</p>
						<p className="break-words max-w-full">via: {process.env.NEXT_PUBLIC_SITE_URL}/{params.year}/{params.month}/{params.slug} </p>
					</div>
				) : (
					<p className="break-words max-w-full text-center">{isFetching ? `${selectedTab === 'gemini' ? 'Gemini' : 'ChatGPT'}正在为你总结信息，请稍等...` : '点击下方按钮生成本文摘要'}</p>
				)}
				<div className="flex justify-center items-center">
					{showCopyButton ? (
						<CopyToClipboard text={copyText} onCopy={() => setIsCopied(true)}>
							<button className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded mt-2">
								{isCopied ? '已复制' : '复制摘要'}
							</button>
						</CopyToClipboard>
					) : (
						<button
							className="bg-black hover:bg-gray-700 text-white text-xs font-bold py-1 px-2 rounded mt-2"
							onClick={fetchSummary}
							disabled={isFetching}
						>
							生成摘要
						</button>
					)}
				</div>
			</>
		</div>
	)
}	  