import type { Locale } from '@/lib/i18n-config'

const escapeText = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The Markdown a reader's reply starts with when they quote a comment.
 * Pure and dependency-free so the client component and the tests share it.
 */
export function buildQuote(username: string, quotedHtml: string, lang: Locale): string {
	const prefix = lang === 'zh' ? '引用' : 'Quoting '
	const suffix = lang === 'zh' ? '的留言：' : "'s comment:"
	// The quote is a raw HTML block in Markdown: a blank line would end it
	// early, so none is left inside, and one after it lets the reply below
	// render as Markdown.
	const body = quotedHtml.replace(/\n(?=[ \t]*\n)/g, '&#10;')
	return `<blockquote><pre>${prefix}${escapeText(username)}${suffix}</pre>${body}</blockquote>\n\n`
}
