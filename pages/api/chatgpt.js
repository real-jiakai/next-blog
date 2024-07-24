import OpenAI from 'openai'

const openai = new OpenAI({
	baseURL: process.env.OPENAI_BASE_URL,
	apiKey: process.env.OPENAI_API_KEY
})

// Create a completion
export default async function handler(req, res) {
	if (req.method === 'POST') {
		const { message } = req.body

		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{
				role: 'user',
				content: message,
			}],
		})

		const summary = completion.choices[0].message.content
		res.status(200).json({ summary })
	}
}
