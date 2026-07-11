import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderPostMarkdown } from './renderPost'
import postImageDimensions from './post-image-dimensions.json'

describe('renderPostMarkdown', () => {
	it('sanitizes active HTML without using a raw HTML sink', () => {
		const { content } = renderPostMarkdown(
			'<script>alert(1)</script><img src="https://example.com/x.png" onerror="alert(2)">'
		)
		const html = renderToStaticMarkup(content)

		expect(html).not.toContain('<script')
		expect(html).not.toContain('onerror')
		expect(html).toContain('loading="lazy"')
		expect(html).not.toContain('width="800"')
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
		const { headings } = renderPostMarkdown('## Hello, *world*\n\n### Details')

		expect(headings).toEqual([
			{ depth: 2, value: 'Hello, world', id: 'hello-world' },
			{ depth: 3, value: 'Details', id: 'details' },
		])
	})
})
