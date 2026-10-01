import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderPostMarkdown } from '@/lib/renderPost'
import postImageDimensions from '@/lib/post-image-dimensions.json'

describe('renderPostMarkdown', () => {
	it('sanitizes active HTML without using a raw HTML sink', () => {
		const { content } = renderPostMarkdown(
			'<script>alert(1)</script><img src="https://example.com/x.png" onerror="alert(2)">'
		)
		const html = renderToStaticMarkup(content)

		expect(html).not.toContain('<script')
		expect(html).not.toContain('onerror')
		expect(html).not.toContain('width="800"')
	})

	it('loads the first image eagerly and defers the rest', () => {
		const { content } = renderPostMarkdown(
			'![Cover](https://example.com/cover.png)\n\n![Later](https://example.com/later.png)'
		)
		const images = renderToStaticMarkup(content).match(/<img\b[^>]*>/g) ?? []

		expect(images).toHaveLength(2)
		expect(images[0]).toContain('loading="eager"')
		expect(images[0]).toMatch(/fetchPriority="high"/i)
		expect(images[1]).toContain('loading="lazy"')
		expect(images[1]).not.toMatch(/fetchPriority/i)
	})

	it('preserves explicit image dimensions from sanitized post HTML', () => {
		const { content } = renderPostMarkdown(
			'<img src="https://example.com/x.png" alt="Example" width="640" height="480">'
		)
		const html = renderToStaticMarkup(content)

		expect(html).toContain('width="640"')
		expect(html).toContain('height="480"')
	})

	it('adds real intrinsic dimensions for Markdown images in the post manifest', () => {
		const source = 'https://cdn.sa.net/2024/02/29/Kp9XZuvGzILa4Wt.webp'
		const { content } = renderPostMarkdown(`![Example](${source})`)
		const html = renderToStaticMarkup(content)

		expect(html).toContain('width="2242"')
		expect(html).toContain('height="1328"')
		// Off-screen images reserve their real box rather than the CSS fallback.
		expect(html).toContain('contain-intrinsic-size:auto 2242px auto 1328px')
	})

	it('renders every current post image with measured dimensions', () => {
		const postRoot = path.join(process.cwd(), 'posts')
		const files = fs
			.readdirSync(postRoot, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		const missing = new Set<string>()

		for (const entry of files) {
			const markdown = fs.readFileSync(path.join(entry.parentPath, entry.name), 'utf8')
			const html = renderToStaticMarkup(renderPostMarkdown(markdown).content)
			for (const match of html.matchAll(/<img\b[^>]*>/g)) {
				if (!/\bwidth="[1-9]\d*"/.test(match[0]) || !/\bheight="[1-9]\d*"/.test(match[0])) {
					missing.add(`${entry.name}: ${match[0]}`)
				}
			}
		}

		expect([...missing]).toEqual([])
	})

	it('keeps and hardens the supported Bilibili embed', () => {
		const { content } = renderPostMarkdown(
			'<iframe src="//player.bilibili.com/player.html?bvid=abc"></iframe>'
		)
		const html = renderToStaticMarkup(content)

		expect(html).toContain('https://player.bilibili.com/player.html?bvid=abc')
		expect(html).toContain('title="Bilibili video player"')
		expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"')
	})

	it('removes unsupported iframe origins', () => {
		const { content } = renderPostMarkdown(
			'<iframe src="https://evil.example/embed"></iframe>'
		)
		const html = renderToStaticMarkup(content)

		expect(html).not.toContain('<iframe')
		expect(html).toContain('Unsupported embed removed')
	})

	it('preserves accessible video captions while protecting element IDs', () => {
		const { content } = renderPostMarkdown(
			'<figure><video controls title="Demo" aria-describedby="demo-caption"><source src="https://example.com/demo.mp4" type="video/mp4"></video><figcaption id="demo-caption">A demo video.</figcaption></figure>'
		)
		const html = renderToStaticMarkup(content)

		expect(html).toContain('<figure>')
		expect(html).toContain('title="Demo"')
		expect(html).toContain('aria-describedby="user-content-demo-caption"')
		expect(html).toContain('id="user-content-demo-caption"')
	})

	it('derives the table of contents from the rendered heading IDs', () => {
		const { content, headings } = renderPostMarkdown('## Hello, *world*\n\n### Details')

		expect(headings).toEqual([
			{ depth: 2, value: 'Hello, world', id: 'hello-world' },
			{ depth: 3, value: 'Details', id: 'details' },
		])
		expect(renderToStaticMarkup(content)).toContain(
			'<h2 id="hello-world" class="scroll-mt-24">Hello, <em>world</em></h2>'
		)
	})

	it('links footnotes to their sanitized IDs in both directions', () => {
		const { content } = renderPostMarkdown('Text[^1] and again[^1].\n\n[^1]: A note.', 'en')
		const html = renderToStaticMarkup(content)
		const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
		const targets = [...html.matchAll(/\bhref="#([^"]+)"/g)].map((match) => match[1])

		expect(html).toContain('id="user-content-fn-1"')
		expect(html).toContain('href="#user-content-fn-1"')
		expect(html).toContain('id="user-content-fnref-1"')
		expect(html).toContain('href="#user-content-fnref-1"')
		expect(html).toContain('aria-describedby="user-content-footnote-label"')
		expect(html).not.toContain('user-content-user-content')
		expect(targets).toHaveLength(4)
		expect(targets.filter((target) => !ids.has(target))).toEqual([])
	})

	it('localizes the footnote labels and keeps them out of the table of contents', () => {
		const markdown = '## A\n\nText[^1] and again[^1].\n\n[^1]: A note.'
		const zh = renderPostMarkdown(markdown, 'zh')
		const en = renderPostMarkdown(markdown, 'en')
		const zhHtml = renderToStaticMarkup(zh.content)
		const enHtml = renderToStaticMarkup(en.content)

		expect(zhHtml).toContain('>脚注</h2>')
		expect(zhHtml).toContain('aria-label="返回引用 1"')
		expect(zhHtml).toContain('aria-label="返回引用 1-2"')
		expect(zhHtml).not.toContain('Back to reference')
		expect(enHtml).toContain('>Footnotes</h2>')
		expect(enHtml).toContain('aria-label="Back to reference 1-2"')
		expect(zh.headings).toEqual([{ depth: 2, value: 'A', id: 'a' }])
		expect(en.headings).toEqual([{ depth: 2, value: 'A', id: 'a' }])
	})

	it('points every in-page link in current posts at an existing ID', () => {
		const postRoot = path.join(process.cwd(), 'posts')
		const files = fs
			.readdirSync(postRoot, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		const broken: string[] = []

		for (const entry of files) {
			const locale = path.basename(entry.parentPath) === 'en' ? 'en' : 'zh'
			const markdown = fs.readFileSync(path.join(entry.parentPath, entry.name), 'utf8')
			const html = renderToStaticMarkup(renderPostMarkdown(markdown, locale).content)
			const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]))
			for (const [, target] of html.matchAll(/\bhref="#([^"]*)"/g)) {
				if (!ids.has(target)) broken.push(`${entry.name}: #${target}`)
			}
		}

		expect(broken).toEqual([])
	})

	it('highlights known code languages and leaves unknown ones as plain code', () => {
		const render = (markdown: string) =>
			renderToStaticMarkup(renderPostMarkdown(markdown).content)

		expect(() => render('```zsh\necho hi\n```')).not.toThrow()
		expect(render('```zsh\necho hi\n```')).toContain('echo hi')
		expect(render('```bash\necho hi\n```')).toContain('class="token')
	})

	it('gives post links colours that stay readable in dark mode', () => {
		const html = renderToStaticMarkup(
			renderPostMarkdown('[Link](https://example.com)').content
		)

		expect(html).toContain(
			'class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"'
		)
	})
})
