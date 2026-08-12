import { describe, expect, it } from 'vitest'
import {
	MAX_FEED_ITEMS,
	createAtomFeed,
	readFeedConfig,
	renderMarkdown,
	selectFeedPosts,
} from '../scripts/generate-rss.mjs'

const config = {
	siteUrl: 'https://example.com',
	title: 'Example Blog',
	description: 'Example description',
	copyright: '',
}

describe('RSS configuration', () => {
	it('fails clearly when required variables are absent', () => {
		expect(() => readFeedConfig({})).toThrow(
			'Missing required RSS environment variables',
		)
	})

	it('normalizes the configured site URL', () => {
		expect(
			readFeedConfig({
				NEXT_PUBLIC_SITE_URL: 'https://example.com/',
				NEXT_PUBLIC_SITE_TITLE: 'Example',
				NEXT_PUBLIC_SITE_DESCRIPTION: 'Description',
			}),
		).toMatchObject({ siteUrl: 'https://example.com' })
	})

	it('uses locale-specific descriptions with a generic fallback', () => {
		expect(
			readFeedConfig({
				NEXT_PUBLIC_SITE_URL: 'https://example.com',
				NEXT_PUBLIC_SITE_TITLE: 'Example',
				NEXT_PUBLIC_SITE_DESCRIPTION: 'Generic',
				NEXT_PUBLIC_SITE_DESCRIPTION_EN: 'English description',
			}).descriptions,
		).toEqual({ zh: 'Generic', en: 'English description' })
	})
})

describe('RSS Markdown rendering', () => {
	it('parses safe raw HTML instead of showing escaped markup', () => {
		const html = renderMarkdown(`
<a href="https://example.com" target="_blank">Link</a>
<figure><iframe src="https://player.bilibili.com/player.html"></iframe><figcaption>Demo</figcaption></figure>
<video aria-describedby="transcript"><source src="https://example.com/video.mp4" type="video/mp4"></video>
		`)

		expect(html).toContain('<a href="https://example.com"')
		expect(html).toContain('<iframe src="https://player.bilibili.com/player.html"')
		expect(html).toContain('title="Bilibili video player"')
		expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"')
		expect(html).toContain('referrerpolicy="no-referrer"')
		expect(html).toContain('<figcaption>Demo</figcaption>')
		expect(html).toContain('preload="metadata"')
		expect(html).toContain('aria-describedby="user-content-transcript"')
		expect(html).not.toContain('&#x3C;iframe')
	})

	it('removes active content and inline event handlers', () => {
		const html = renderMarkdown(
			'<script>alert(1)</script><a href="https://example.com" onclick="alert(1)">safe</a>',
		)

		expect(html).not.toContain('<script')
		expect(html).not.toContain('onclick')
	})

	it('replaces unsupported iframe origins', () => {
		const html = renderMarkdown(
			'<iframe src="https://evil.example/embed"></iframe>',
		)

		expect(html).toContain('[Unsupported embed removed]')
		expect(html).not.toContain('evil.example')
	})

	it('adds safe link relations and expands emoji shortcodes', () => {
		const html = renderMarkdown(
			'<a href="https://example.com" target="_blank">Open</a> :rocket:',
		)

		expect(html).toContain('rel="noopener noreferrer"')
		expect(html).toContain('🚀')
	})
})

describe('Atom output', () => {
	it('uses the newest post date rather than build time', () => {
		const posts = [
			{
				title: 'Post',
				date: new Date('2025-02-03T00:00:00.000Z'),
				slug: 'post',
				contentMarkdown: 'Hello',
			},
		]

		const first = createAtomFeed(posts, 'en', config)
		const second = createAtomFeed(posts, 'en', config)

		expect(first).toBe(second)
		expect(first).toContain('<updated>2025-02-03T00:00:00.000Z</updated>')
		expect(first).toContain(
			'<link rel="self" href="https://example.com/en/index.xml"/>',
		)
	})

	it('uses the requested locale description', () => {
		const localizedConfig = {
			...config,
			descriptions: { zh: '中文描述', en: 'English description' },
		}
		const feed = createAtomFeed([], 'en', localizedConfig)
		expect(feed).toContain('<subtitle>English description</subtitle>')
	})
})

describe('feed length', () => {
	const posts = (count) =>
		Array.from({ length: count }, (_, index) => ({
			title: `Post ${count - index}`,
			// Newest first, as getSortedPostsData returns them.
			date: new Date(Date.UTC(2026, 0, count - index)),
			slug: `post-${count - index}`,
			contentMarkdown: 'body',
		}))

	it('caps a long archive at the newest items', () => {
		const selected = selectFeedPosts(posts(40))
		expect(selected).toHaveLength(MAX_FEED_ITEMS)
		expect(selected[0].slug).toBe('post-40')
		expect(selected.at(-1).slug).toBe(`post-${40 - MAX_FEED_ITEMS + 1}`)
	})

	it('leaves a short archive alone', () => {
		expect(selectFeedPosts(posts(5))).toHaveLength(5)
	})

	it('keeps the feed to the cap end to end', () => {
		const feed = createAtomFeed(selectFeedPosts(posts(40)), 'en', config)
		expect(feed.match(/<entry>/g)).toHaveLength(MAX_FEED_ITEMS)
	})
})
