import OpenAI from 'openai'

const openai = new OpenAI({
	baseURL: process.env.DASHSCOPE_BASE_URL,
	apiKey: process.env.DASHSCOPE_API_KEY
})

export default async function handler(req, res) {
	if (req.method === 'POST') {
		const { message } = req.body

		res.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			'Connection': 'keep-alive',
		})

		try {
			const stream = await openai.chat.completions.create({
				model: 'qwen-turbo-1101',
				messages: [{ role: 'user', content: message }],
				stream: true,
			})

			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || ''
				if (content) {
					res.write(`data: ${JSON.stringify({ content })}\n\n`)
				}
			}
		} catch (error) {
			console.error('Error in OpenAI stream:', error)
			res.write(`data: ${JSON.stringify({ error: '获取摘要时出错，请稍后重试。' })}\n\n`)
		} finally {
			res.end()
		}
	} else {
		res.status(405).json({ error: 'Method not allowed' })
	}
}