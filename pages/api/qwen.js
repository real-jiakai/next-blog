import fetch from 'node-fetch'

export default async function handler(req, res) {
	if (req.method === 'POST') {
		const { message } = req.body

		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
		})

		try {
			const apiKey = process.env.DASHSCOPE_API_KEY
			
			const data = {
				model: 'qwen-turbo',
				input: {
					messages: [
						{
							role: 'user',
							content: message
						}
					]
				},
				parameters: {
					result_format: 'message',
					incremental_output: true // 开启流式输出
				}
			}

			const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
					'Accept': 'text/event-stream'
				},
				body: JSON.stringify(data)
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(`DashScope API 错误: ${errorData.message || response.statusText}`)
			}

			// 使用 Node.js 友好的流处理方式
			response.body.on('data', (chunk) => {
				const textChunk = chunk.toString()
				const lines = textChunk.split('\n').filter(line => line.trim() !== '')
				
				for (const line of lines) {
					if (line.startsWith('data:')) {
						try {
							const jsonData = JSON.parse(line.slice(5).trim())
							
							// 只处理包含内容的响应
							if (jsonData.output?.choices?.[0]?.message?.content) {
								const content = jsonData.output.choices[0].message.content
								res.write(`data: ${JSON.stringify({ content })}\n\n`)
							}
						} catch (e) {
							console.error('解析流式数据失败:', e, '原始数据:', line)
						}
					}
				}
			})

			response.body.on('end', () => {
				res.end()
			})

			response.body.on('error', (err) => {
				console.error('流处理错误:', err)
				res.write(`data: ${JSON.stringify({ error: '处理响应时出错，请稍后重试。' })}\n\n`)
				res.end()
			})
			
		} catch (error) {
			console.error('Error in DashScope API:', error)
			res.write(`data: ${JSON.stringify({ error: '获取摘要时出错，请稍后重试。' })}\n\n`)
			res.end()
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}