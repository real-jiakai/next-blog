import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { collectSources, loadSource } from '@/scripts/collect-image-dimensions.mjs'
import { renderPostMarkdown } from '@/lib/renderPost'
import postImageDimensions from '@/lib/post-image-dimensions.json'

function renderedSources(markdown) {
	const html = renderToStaticMarkup(renderPostMarkdown(markdown).content)
	return [...html.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((match) =>
		match[1].replaceAll('&amp;', '&')
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('collectSources', () => {
	it('keys images by the src the post renderer looks up', () => {
		const markdown = [
			'![封面](https://cdn.example.com/图片/封面.webp)',
			'![spaced](<https://cdn.example.com/a b.png>)',
			'![ref][cover]',
			'',
			'[cover]: https://cdn.example.com/ref.png',
			'',
			'<img src="https://cdn.example.com/x.png?a=1&amp;b=2" alt="raw">',
			'<img data-src="https://cdn.example.com/lazy.png" src="/gif/local.gif" alt="lazy">',
		].join('\n')

		const sources = [...collectSources(markdown)]

		expect(sources).toEqual(renderedSources(markdown))
		expect(sources).toEqual([
			'https://cdn.example.com/%E5%9B%BE%E7%89%87/%E5%B0%81%E9%9D%A2.webp',
			'https://cdn.example.com/a%20b.png',
			'https://cdn.example.com/ref.png',
			'https://cdn.example.com/x.png?a=1&b=2',
			'/gif/local.gif',
		])
	})

	it('collects exactly the keys of the committed manifest from the current posts', () => {
		const postsRoot = path.join(process.cwd(), 'posts')
		const sources = new Set()
		// Every Markdown file under posts/, as the script walks it. Anything
		// else there, such as macOS's .DS_Store, is skipped, not read as a
		// locale directory.
		for (const file of fs.readdirSync(postsRoot, { recursive: true })) {
			if (!file.endsWith('.md')) continue
			const markdown = fs.readFileSync(path.join(postsRoot, file), 'utf8')
			for (const source of collectSources(markdown)) sources.add(source)
		}

		expect([...sources].sort()).toEqual(Object.keys(postImageDimensions).sort())
	})
})

describe('loadSource', () => {
	it('fetches protocol-relative images over HTTPS instead of reading public/', async () => {
		const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
		vi.stubGlobal('fetch', fetchMock)

		const loaded = await loadSource('//cdn.example.com/a.webp')

		expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/a.webp', expect.any(Object))
		expect(loaded.buffer).toEqual(Buffer.from([1, 2, 3]))
	})

	it('reads root-relative images from public/', async () => {
		const loaded = await loadSource('/video/2023-01-26-curry-throws-his-mouthpiece.webp')

		expect(loaded.buffer.subarray(8, 12).toString('ascii')).toBe('WEBP')
	})
})
