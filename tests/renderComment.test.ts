import { describe, it, expect } from 'vitest'
import { renderCommentHtml, commentToPlainText, escapeHtml } from '@/lib/renderComment'
import { buildQuote } from '@/lib/commentQuote'

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

	it('keeps same-page fragment links in the current tab', async () => {
		const html = await renderCommentHtml(
			'[jump](#comment-3) <a href="#x" target="_top" rel="opener">x</a>'
		)
		expect(html).toContain('<a href="#comment-3">jump</a>')
		expect(html).toContain('<a href="#x">x</a>')
		expect(html).not.toContain('target=')
	})

	it('points footnote links at their prefixed ids', async () => {
		const html = await renderCommentHtml('Footnote[^1]\n\n[^1]: note')
		const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1])
		const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1])

		expect(hrefs).toEqual(['user-content-fn-1', 'user-content-fnref-1'])
		for (const href of hrefs) expect(ids).toContain(href)
		expect(html).not.toContain('user-content-user-content-')
	})

	it('still prefixes user-supplied ids', async () => {
		const html = await renderCommentHtml('<p id="evil">x</p>')
		expect(html).toContain('id="user-content-evil"')
	})

	it('keeps a comment\'s footnotes apart from the article\'s', async () => {
		const html = await renderCommentHtml('Note[^1]\n\n[^1]: mine', 'comment-12-')
		const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
		const targets = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1])

		expect(ids).toContain('user-content-comment-12-fn-1')
		expect(ids).not.toContain('user-content-fn-1')
		expect(targets.length).toBeGreaterThan(0)
		for (const target of targets) expect(ids).toContain(target)
	})
})

describe('renderCommentHtml — Quote feature compatibility', () => {
	// The quote components/Comment puts in front of the reader's reply.
	const quote = (name: string, quotedHtml: string, reply: string) =>
		buildQuote(name, quotedHtml, 'en') + reply

	it('renders the reply after a quote as Markdown', async () => {
		const html = await renderCommentHtml(
			quote('Bob', '<p>original</p>', 'I **agree**, see [docs](https://example.com)')
		)
		expect(html).toContain('<blockquote><pre>Quoting Bob\'s comment:</pre><p>original</p></blockquote>')
		expect(html).toContain('<strong>agree</strong>')
		expect(html).toContain('href="https://example.com"')
		expect(html).not.toContain('<p></p>')
	})

	it('keeps an escaped name inside the quote header', async () => {
		const html = await renderCommentHtml(quote('a<b', '<p>original</p>', 'reply'))
		expect(html).toContain('<pre>Quoting a&#x3C;b\'s comment:</pre><p>original</p>')
	})

	it('keeps a quoted code block with blank lines inside the quote', async () => {
		const html = await renderCommentHtml(
			quote('Bob', '<pre><code>a\n\nb\n</code></pre>', 'reply')
		)
		expect(html).toContain('<pre><code>a\n\nb\n</code></pre></blockquote>')
		expect(html).toContain('<p>reply</p>')
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

	it('decodes every character reference', async () => {
		expect(await commentToPlainText('Tom & Jerry <3 `a && b`')).toBe(
			'Tom & Jerry <3 a && b'
		)
	})

	it('never leaks attribute values', async () => {
		expect(await commentToPlainText('[l](https://e.example "x>y") after')).toBe(
			'l after'
		)
		expect(await commentToPlainText('![a>b](https://x.example/y.png) after')).toBe(
			'after'
		)
	})
})

describe('renderCommentHtml — emoji shortcodes', () => {
	it('converts :tada: to the unicode emoji', async () => {
		const html = await renderCommentHtml('nice :tada:')
		expect(html).toContain('🎉')
		expect(html).not.toContain(':tada:')
	})

	it('converts :+1: to the unicode emoji', async () => {
		const html = await renderCommentHtml(':+1:')
		expect(html).toContain('👍')
	})

	it('leaves shortcodes inside code blocks literal', async () => {
		const html = await renderCommentHtml('```\n:tada:\n```')
		expect(html).toContain(':tada:')
		expect(html).not.toContain('🎉')
	})

	it('emoji in text survive alongside sanitized content', async () => {
		const html = await renderCommentHtml('great :rocket:\n\n<script>alert(1)</script>')
		expect(html).toContain('🚀')
		expect(html).not.toContain('<script')
	})
})
