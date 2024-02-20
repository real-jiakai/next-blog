import OpenAI from 'openai'

const openai = new OpenAI({
	baseURL: process.env.AIGC_API_ADDRESS,
	apiKey: process.env.AIGC_API_KEY
})

// Create a completion
export default async function handler(req, res) {
	if (req.method === 'POST') {
		const { message } = req.body

		const completion = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [{
				role: 'user',
				content: message,
			}],
		})

		const gptResponse = completion.choices[0].message.content
		res.status(200).json({ gptResponse })
	}
}
