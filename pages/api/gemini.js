import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY)

export default async function handler(req, res) {
	if (req.method === 'POST') {
		const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
        
		const { message } = req.body

		const result = await model.generateContent(message)
		const response = await result.response
		const summary = response.text()
		res.status(200).json({ summary })
	}
}