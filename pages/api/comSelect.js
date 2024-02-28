import supabase from 'utils/supabase'

const fetchCommentsFromDB = async (url) => {
	// 如果URL包含/en/，则移除它；如果不包含，则在hostname后插入/en/
	const alternativeUrl = url.includes('/en/')
	  ? url.replace('/en/', '/')
	  : url.replace(/^(https?:\/\/[^\/]+)(\/|$)/, '$1/en/')
  
	const { data, error } = await supabase
	  .from('comments')
	  .select('*')
	  // 使用逻辑或条件来匹配原始URL或替换后的URL
	  .or(`url.eq.${url},url.eq.${alternativeUrl}`)
	  .order('created_at', { ascending: true })
  
	if (error) {
	  throw new Error(error.message)
	}
  
	return data
}
export default async function handler(req, res) {
	try {
		const comments = await fetchCommentsFromDB(req.headers.referer)
		res.status(200).json(comments)
	} catch (error) {
		res.status(500).json({ error: error.message })
	}
}
