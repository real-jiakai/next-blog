import { describe, it, expect } from 'vitest'
import { renderCommentHtml, commentToPlainText, escapeHtml } from './renderComment'

describe('renderCommentHtml — XSS neutralization', () => {
	it('removes <script> elements', async () => {
		const html = await renderCommentHtml('<script>alert(1)</script>')
		expect(html).not.toContain('<script')
	})

	it('removes onerror and other event handlers from <img>', async () => {
		const html = await renderCommentHtml('<img src="x" onerror="alert(1)">')
		expect(html).not.toContain('onerror')
	})

	it('strips javascript: URLs from raw HTML links', async () => {
		const html = await renderCommentHtml('<a href="javascript:alert(1)">x</a>')
		expect(html).not.toContain('javascript:')
	})

	it('strips javascript: URLs from Markdown links', async () => {
		const html = await renderCommentHtml('[x](javascript:alert(1))')
		expect(html).not.toContain('javascript:')
	})

	it('removes <iframe> elements', async () => {
		const html = await renderCommentHtml('<iframe src="https://evil.example"></iframe>')
		expect(html).not.toContain('<iframe')
	})

	it('removes inline event handlers from block elements', async () => {
		const html = await renderCommentHtml('<div onclick="alert(1)">x</div>')
		expect(html).not.toContain('onclick')
	})

	it('removes inline style attributes', async () => {
		const html = await renderCommentHtml('<p style="position:fixed">x</p>')
		expect(html).not.toContain('style=')
	})
})

describe('renderCommentHtml — Markdown preservation', () => {
	it('renders headings', async () => {
		const html = await renderCommentHtml('# Hello')
		expect(html).toContain('<h1>Hello</h1>')
	})

	it('renders bold text', async () => {
		const html = await renderCommentHtml('**bold**')
		expect(html).toContain('<strong>bold</strong>')
	})

	it('renders unordered lists', async () => {
		const html = await renderCommentHtml('- a\n- b')
		expect(html).toContain('<ul>')
		expect(html).toContain('<li>a</li>')
	})

	it('renders GFM tables', async () => {
		const html = await renderCommentHtml('| h |\n| - |\n| c |')
		expect(html).toContain('<table>')
	})

	it('renders fenced code blocks', async () => {
		const html = await renderCommentHtml('```\ncode\n```')
		expect(html).toContain('<pre>')
		expect(html).toContain('<code>')
	})

	it('renders inline code', async () => {
		const html = await renderCommentHtml('use `x` here')
		expect(html).toContain('<code>x</code>')
	})
})

describe('renderCommentHtml — link hardening', () => {
	it('adds rel and target to links', async () => {
		const html = await renderCommentHtml('[site](https://example.com)')
		expect(html).toContain('href="https://example.com"')
		expect(html).toContain('target="_blank"')
		expect(html).toContain('rel="nofollow noopener noreferrer"')
	})
})

describe('renderCommentHtml — Quote feature compatibility', () => {
	it('preserves the blockquote/pre/p structure produced by the Quote feature', async () => {
		const quote = '<blockquote><pre>Quoting Bob:</pre><p>original</p></blockquote>\n\nmy reply'
		const html = await renderCommentHtml(quote)
		expect(html).toContain('<blockquote>')
		expect(html).toContain('<pre>')
		expect(html).toContain('original')
	})
})

describe('escapeHtml', () => {
	it('escapes HTML metacharacters', () => {
		expect(escapeHtml(`<b>&"'`)).toBe('&lt;b&gt;&amp;&quot;&#39;')
	})
})

describe('commentToPlainText', () => {
	it('strips tags and keeps readable text', async () => {
		const text = await commentToPlainText('# Hi\n\n**bold** <script>alert(1)</script>')
		expect(text).toContain('Hi')
		expect(text).toContain('bold')
		expect(text).not.toContain('<')
		expect(text).not.toContain('>')
	})
})
