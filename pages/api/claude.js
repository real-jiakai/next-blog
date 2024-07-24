import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
	apiKey: process.env['ANTHROPIC_API_KEY'],
	baseURL: process.env['ANTHROPIC_BASE_URL']
})

export default async function handler(req, res) {
	if (req.method === 'POST') {
		const { message } = req.body

		const ms = await anthropic.messages.create({
			messages: [{ role: 'user', content: message }],
			model: 'claude-3-haiku-20240307',
			max_tokens: 1024
		})

		const summary = ms.content[0].text
		res.status(200).json({ summary })
	}
}
