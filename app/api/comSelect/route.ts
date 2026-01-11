import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

async function fetchCommentsFromDB(url: string) {
	// Handle both /en/ and /zh/ locale prefixes
	const alternativeUrl = url.includes('/en/')
		? url.replace('/en/', '/')
		: url.replace(/^(https?:\/\/[^/]+)(\/|$)/, '$1/en/')

	// Also handle /zh/ prefix
	const zhUrl = url.includes('/zh/')
		? url.replace('/zh/', '/')
		: url.replace(/^(https?:\/\/[^/]+)(\/|$)/, '$1/zh/')

	const { data, error } = await supabase
		.from('comments')
		.select('*')
		.or(`url.eq.${url},url.eq.${alternativeUrl},url.eq.${zhUrl}`)
		.order('created_at', { ascending: true })

	if (error) {
		throw new Error(error.message)
	}

	return data
}

export async function GET(request: NextRequest) {
	try {
		const referer = request.headers.get('referer') || ''
		const comments = await fetchCommentsFromDB(referer)
		return NextResponse.json(comments)
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return NextResponse.json({ error: errorMessage }, { status: 500 })
	}
}
