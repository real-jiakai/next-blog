import Groq from 'groq-sdk'

const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY
})

export default async function handler(req, res) {
	if (req.method === 'POST') {

		const { message } = req.body

		const result = await groq.chat.completions.create({
			messages: [{
				role: 'user',
				content: message
			}],
			model: 'mixtral-8x7b-32768',
		})
		const summary = result.choices[0]?.message?.content || ''
		res.status(200).json({ summary })
	}
}