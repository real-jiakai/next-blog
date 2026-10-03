import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
	MAX_FEED_ITEMS,
	createAtomFeed,
	getSortedPostsData,
	readFeedConfig,
	renderMarkdown,
	selectFeedPosts,
} from '@/scripts/generate-rss.mjs'
import zh from '@/lib/dictionaries/zh.json'
import en from '@/lib/dictionaries/en.json'

const config = {
	siteUrl: 'https://example.com',
	title: 'Example Blog',
	description: 'Example description',
	copyright: '',
}

const post = (overrides = {}) => ({
	title: 'Post',
	date: new Date('2025-02-03T00:00:00.000Z'),
	slug: 'post',
	contentMarkdown: 'Hello',
	...overrides,
})

const fragmentTargets = (html) =>
	[...html.matchAll(/href="[^"#]*#([^"]+)"/g)].map((match) => match[1])

// What remains once every CDATA section is removed must hold no CDATA syntax,
// or a section was ended early.
const textOutsideCdata = (xml) => xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')

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

	it('gives the English feed its own title, falling back to the brand', () => {
		const base = {
			NEXT_PUBLIC_SITE_URL: 'https://example.com',
			NEXT_PUBLIC_SITE_TITLE: '周见',
			NEXT_PUBLIC_SITE_DESCRIPTION: 'Generic',
		}
		expect(
			readFeedConfig({ ...base, NEXT_PUBLIC_SITE_TITLE_EN: '周见 · Zhōu Jiàn' }),
		).toMatchObject({ title: '周见', titles: { zh: '周见', en: '周见 · Zhōu Jiàn' } })
		expect(readFeedConfig(base).titles).toEqual({ zh: '周见', en: '周见' })
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

	it('points footnote links at the ids sanitization gives them', () => {
		const html = renderMarkdown('Text[^1] again[^1]\n\n[^1]: Note')
		const targets = fragmentTargets(html)

		expect(targets).toContain('user-content-fn-1')
		expect(targets).toContain('user-content-fnref-1')
		for (const target of targets) {
			expect(html).toContain(`id="${target}"`)
		}
		expect(html).not.toContain('user-content-user-content')
	})

	it('labels footnotes in the feed language', () => {
		const markdown = '中文[^1]\n\n[^1]: 注释'
		const chinese = renderMarkdown(markdown, { locale: 'zh' })
		const english = renderMarkdown(markdown, { locale: 'en' })

		expect(chinese).toContain('脚注')
		expect(chinese).toContain('aria-label="返回引用 1"')
		expect(chinese).not.toContain('Footnotes')
		expect(english).toContain('Footnotes')
		expect(english).toContain('aria-label="Back to reference 1"')
	})

	it('renders a code fence in a language Prism does not know', () => {
		expect(renderMarkdown('```zsh\necho hi\n```')).toContain('echo hi')
	})

	it('keeps classes only where the post schema allows them', () => {
		const html = renderMarkdown(
			'<div class="subscribe-box"><p class="header">hi</p></div>\n\n' +
				'<iframe class="bilibili" src="https://player.bilibili.com/player.html"></iframe>',
		)

		expect(html).not.toContain('subscribe-box')
		expect(html).not.toContain('class="header"')
		expect(html).toContain('class="bilibili"')
	})

	it('drops a video poster with an unsafe protocol', () => {
		const html = renderMarkdown(
			'<video poster="javascript:alert(1)" src="https://example.com/v.mp4"></video>',
		)

		expect(html).not.toContain('javascript:')
		expect(html).toContain('src="https://example.com/v.mp4"')
	})

	it('turns a GIF-like clip into a player with absolute media URLs', () => {
		const html = renderMarkdown(
			[
				'<video autoplay loop muted playsinline poster="/video/clip.webp" width="600" height="338" aria-label="A clip">',
				'  <source src="/video/clip.webm" type="video/webm">',
				'  <source src="/video/clip.mp4" type="video/mp4">',
				'</video>',
			].join('\n'),
			{ baseUrl: 'https://example.com/2023/01/post' },
		)
		const video = html.match(/<video\b[^>]*>/)?.[0] ?? ''

		expect(video).not.toContain('autoplay')
		expect(video).toContain('controls')
		expect(video).toContain('loop')
		expect(video).toContain('muted')
		expect(video).toContain('playsinline')
		expect(video).toContain('preload="metadata"')
		expect(video).toContain('aria-label="A clip"')
		expect(video).toContain('poster="https://example.com/video/clip.webp"')
		expect(html).toContain('<source src="https://example.com/video/clip.webm" type="video/webm">')
		expect(html).toContain('<source src="https://example.com/video/clip.mp4" type="video/mp4">')
	})

	it('lazy-loads images', () => {
		const html = renderMarkdown('![Alt](https://example.com/a.png)')

		expect(html).toContain('loading="lazy"')
		expect(html).toContain('decoding="async"')
	})

	it('resolves relative URLs against the post when given its URL', () => {
		const html = renderMarkdown(
			'![Alt](/gif/a.gif) [Top](#top) [Out](https://other.example/x) [Mail](mailto:a@example.com)',
			{ baseUrl: 'https://example.com/2025/02/post' },
		)

		expect(html).toContain('src="https://example.com/gif/a.gif"')
		expect(html).toContain('href="https://example.com/2025/02/post#top"')
		expect(html).toContain('href="https://other.example/x"')
		expect(html).toContain('href="mailto:a@example.com"')
	})
})

describe('post loading', () => {
	let directory

	afterEach(() => {
		if (directory) fs.rmSync(directory, { recursive: true, force: true })
		directory = undefined
	})

	const writePosts = (files) => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rss-posts-'))
		fs.mkdirSync(path.join(directory, 'zh'))
		for (const [name, source] of Object.entries(files)) {
			fs.writeFileSync(path.join(directory, 'zh', name), source)
		}
		return directory
	}

	it('skips a draft before checking its frontmatter', () => {
		const postsBase = writePosts({
			'wip.md': '---\ntitle: "WIP"\ndraft: true\n---\nBody',
		})

		expect(getSortedPostsData('zh', postsBase)).toEqual([])
	})

	it('still rejects a published post with missing frontmatter', () => {
		const postsBase = writePosts({ 'broken.md': '---\ntitle: "Broken"\n---\nBody' })

		expect(() => getSortedPostsData('zh', postsBase)).toThrow(
			'Missing title, slug, or date',
		)
	})

	it('reads the featured track', () => {
		const postsBase = writePosts({
			'post.md': [
				'---',
				'title: "Post"',
				'slug: "post"',
				'date: "2025-02-03"',
				'audio:',
				'  name: "Song"',
				'  artist: "Singer"',
				'  url: "https://music.example.com/song.mp3"',
				'---',
				'Body',
			].join('\n'),
		})

		expect(getSortedPostsData('zh', postsBase)[0].audio).toEqual({
			name: 'Song',
			artist: 'Singer',
			url: 'https://music.example.com/song.mp3',
		})
	})

	const withUpdated = (line) =>
		`---\ntitle: "Post"\nslug: "post"\ndate: "2025-02-03"\n${line}\n---\nBody`

	it('reads the date of a substantive revision, and none without one', () => {
		expect(getSortedPostsData('zh', writePosts({ 'post.md': withUpdated('updated: "2025-03-04"') }))[0].updated)
			.toEqual(new Date('2025-03-04T00:00:00.000Z'))
		expect(getSortedPostsData('zh', writePosts({ 'post.md': withUpdated('draft: false') }))[0].updated)
			.toBeNull()
	})

	it.each([
		['unquoted', 'updated: 2025-03-04', 'quote it'],
		['before the post\'s date', 'updated: "2025-02-02"', 'is before its date'],
		['not a day of its month', 'updated: "2025-02-30"', 'Invalid post updated'],
	])('rejects an updated date that is %s, as the site does', (_, line, message) => {
		const postsBase = writePosts({ 'post.md': withUpdated(line) })

		expect(() => getSortedPostsData('zh', postsBase)).toThrow(message)
	})
})

describe('Atom output', () => {
	// The styled feed page dates each entry as the issue page does, by its
	// publication; a revision moves only <updated>.
	it.each(['public/atom-style.xsl', 'public/en/atom-style.xsl'])('shows each entry\'s publication date in %s', (file) => {
		const xsl = fs.readFileSync(path.join(process.cwd(), file), 'utf8')

		expect(xsl).toContain('<xsl:value-of select="substring(atom:published, 1, 10)"/>')
		expect(xsl).not.toContain('atom:updated')
	})

	// Readers may show an entry whose <updated> changed as news, so only a
	// post's own `updated` date moves it.
	it('dates an entry by its last revision and keeps its publication', () => {
		const revised = post({ updated: new Date('2025-04-05T00:00:00.000Z') })
		const feed = createAtomFeed([revised, post({ slug: 'plain', date: new Date('2025-01-01T00:00:00.000Z') })], 'en', config)
		const [header, first, second] = feed.split('<entry>')

		expect(header).toContain('<updated>2025-04-05T00:00:00.000Z</updated>')
		expect(first).toContain('<updated>2025-04-05T00:00:00.000Z</updated>')
		expect(first).toContain('<published>2025-02-03T00:00:00.000Z</published>')
		expect(second).toContain('<updated>2025-01-01T00:00:00.000Z</updated>')
		expect(second).toContain('<published>2025-01-01T00:00:00.000Z</published>')
	})

	it('uses the newest post date rather than build time', () => {
		const posts = [post()]

		const first = createAtomFeed(posts, 'en', config)
		const second = createAtomFeed(posts, 'en', config)

		expect(first).toBe(second)
		expect(first.split('<entry>')[0]).toContain(
			'<updated>2025-02-03T00:00:00.000Z</updated>',
		)
		expect(first).toContain(
			'<link rel="self" href="https://example.com/en/index.xml"/>',
		)
	})

	it('dates the feed by its newest post whatever the order', () => {
		const newer = post({ slug: 'new' })
		const older = post({
			date: new Date('2025-01-01T00:00:00.000Z'),
			slug: 'old',
		})

		for (const posts of [
			[newer, older],
			[older, newer],
		]) {
			const header = createAtomFeed(posts, 'en', config).split('<entry>')[0]
			expect(header).toContain('<updated>2025-02-03T00:00:00.000Z</updated>')
		}
	})

	it('builds the default Chinese feed without the /en prefix', () => {
		const feed = createAtomFeed([post()], 'zh', {
			...config,
			descriptions: { zh: '中文描述', en: 'English description' },
		})

		expect(feed).toContain('<subtitle>中文描述</subtitle>')
		expect(feed).toContain(
			'<link rel="self" href="https://example.com/index.xml"/>',
		)
		expect(feed).toContain('<id>https://example.com/2025/02/post</id>')
		expect(feed).toContain('href="/atom-style.xsl"')
		expect(feed).not.toContain('https://example.com/en')
		expect(feed).not.toContain('/en/atom-style.xsl')
	})

	it('declares the feed language', () => {
		expect(createAtomFeed([], 'zh', config)).toContain(
			'<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh">',
		)
		expect(createAtomFeed([], 'en', config)).toContain(
			'<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
		)
	})

	it('makes entry links and images absolute', () => {
		const feed = createAtomFeed(
			[post({ contentMarkdown: '![Alt](/gif/a.gif)\n\nText[^1]\n\n[^1]: Note' })],
			'en',
			config,
		)

		expect(feed).toContain('src="https://example.com/gif/a.gif"')
		expect(feed).toContain(
			'href="https://example.com/en/2025/02/post#user-content-fn-1"',
		)
	})

	it('keeps every CDATA section intact when a post repeats its terminator', () => {
		const feed = createAtomFeed(
			[
				post({
					title: 'A ]]> B ]]> C',
					contentMarkdown: 'Use `]]>` to end one, and a second `]]>` ends another.',
				}),
			],
			'en',
			config,
		)
		const outside = textOutsideCdata(feed)

		expect(outside).not.toContain(']]>')
		expect(outside).not.toContain('<![CDATA[')
		expect(feed).toContain('<code>]]&gt;</code>')
	})

	it('removes control characters XML does not allow', () => {
		const feed = createAtomFeed(
			[
				post({
					title: 'T\u0008itle',
					contentMarkdown: '```\nconst red = "\u001b[31m"\n```',
				}),
			],
			'en',
			config,
		)

		expect(feed).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
		expect(feed).toContain('<![CDATA[Title]]>')
	})

	it('does not let a removed control character close a CDATA section', () => {
		const feed = createAtomFeed(
			[
				post({
					title: 'A ]]\u0001> B',
					contentMarkdown: 'Bytes: `]]\u0008>` end',
				}),
			],
			'en',
			config,
		)
		const outside = textOutsideCdata(feed)

		expect(outside).not.toContain(']]>')
		expect(outside).not.toContain('<![CDATA[')
		expect(feed).toContain('<![CDATA[A ]]&gt; B]]>')
		expect(feed).toContain('<code>]]&gt;</code>')
	})

	it('names the featured track with an escaped link', () => {
		const feed = createAtomFeed(
			[
				post({
					audio: {
						name: '<b>*Song*</b>',
						artist: 'Singer',
						url: 'https://music.example.com/song.mp3',
					},
				}),
			],
			'zh',
			config,
		)

		expect(feed).toContain(
			'本期 BGM：<a href="https://music.example.com/song.mp3">&#x3C;b>*Song*&#x3C;/b> — Singer</a>',
		)
		expect(feed).not.toContain('<b>')
		expect(feed).not.toContain('<em>Song</em>')
	})

	it.each([['zh', zh], ['en', en]])('labels the %s track with the post page\'s own words', (locale, dictionary) => {
		const feed = createAtomFeed(
			[post({ audio: { name: 'Song', artist: 'Singer', url: 'https://music.example.com/song.mp3' } })],
			locale,
			config,
		)

		expect(feed).toContain(`<p>${dictionary.common.IssueBGM}<a href="https://music.example.com/song.mp3">`)
	})

	it('titles each feed in its language and keeps the brand as author', () => {
		const titledConfig = {
			...config,
			title: '周见',
			titles: { zh: '周见', en: '周见 · Zhōu Jiàn' },
		}
		const english = createAtomFeed([], 'en', titledConfig)
		expect(english).toContain('<title>周见 · Zhōu Jiàn</title>')
		expect(english).toContain('<name>周见</name>')
		expect(createAtomFeed([], 'zh', titledConfig)).toContain('<title>周见</title>')
		// A config without per-locale titles still has one.
		expect(createAtomFeed([], 'en', config)).toContain('<title>Example Blog</title>')
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
