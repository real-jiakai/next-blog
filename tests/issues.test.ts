import { describe, expect, it } from 'vitest'
import {
	coverShape,
	extractCoverImage,
	extractTopicExcerpt,
	fillTemplate,
	formatIssueRange,
	groupByYear,
	isBoilerplateSummary,
	parseIssueTitle,
	truncateExcerpt,
} from '@/lib/issues'

describe('parseIssueTitle', () => {
	it.each([
		['互联网是有记忆的？#14', '互联网是有记忆的？', 14],
		['站在校园与社会的十字路口 #23', '站在校园与社会的十字路口', 23],
		['Hello 2023 #11', 'Hello 2023', 11],
	])('splits %s into its title and issue number', (title, displayTitle, issue) => {
		expect(parseIssueTitle(title)).toEqual({ displayTitle, issue })
	})

	it('leaves a title without a trailing number whole', () => {
		expect(parseIssueTitle('No number')).toEqual({ displayTitle: 'No number', issue: null })
		expect(parseIssueTitle('#1 in the middle of it')).toEqual({
			displayTitle: '#1 in the middle of it',
			issue: null,
		})
	})
})

describe('isBoilerplateSummary', () => {
	it.each(['本期话题：x', '本期话题: x', "This week's topic: x", "This issue's topic: x", '', '  '])(
		'treats %j as no summary',
		(summary) => {
			expect(isBoilerplateSummary(summary)).toBe(true)
		},
	)

	it('keeps a summary someone actually wrote', () => {
		expect(isBoilerplateSummary('一段真正的摘要')).toBe(false)
		expect(isBoilerplateSummary('A topic: worth reading')).toBe(false)
	})
})

const topicPost = `开头一段，在话题之外，不应被选中作为摘要使用。

## 国际视野

这一段在国际视野下面，虽然足够长，但也不应被选中作为摘要。

## 话题：测试

<iframe src="//player.bilibili.com/player.html?bvid=BV1xx" allowfullscreen></iframe>

![一张图片](https://example.com/a.webp)

<center><b>图片的说明文字，也很长很长很长很长</b></center>

短句[^1]。

他，即Donald J. Trump，不出所料地
赢得了大选，**这一行**与上一行
之间的换行应当被去掉[^1]。

## 有趣

后面的段落，不属于话题，同样不应被选中。

[^1]: 脚注。
`

describe('extractTopicExcerpt', () => {
	it('takes the first paragraph of real text under the topic heading', () => {
		expect(extractTopicExcerpt(topicPost, 'zh')).toBe(
			'他，即Donald J. Trump，不出所料地赢得了大选，这一行与上一行之间的换行应当被去掉。',
		)
	})

	it('finds an English Topic heading and keeps a line break between words as a space', () => {
		const post = `## Cover Image\n\n![x](https://example.com/a.webp)\n\n## Topic: Testing\n\nThe first line of the essay\nruns on to a second line.\n`
		expect(extractTopicExcerpt(post, 'en')).toBe(
			'The first line of the essay runs on to a second line.',
		)
	})

	it('cuts a long Chinese paragraph at 90 characters', () => {
		const post = `## 话题：长文\n\n${'测'.repeat(120)}\n`
		expect(extractTopicExcerpt(post, 'zh')).toBe(`${'测'.repeat(90)}…`)
	})

	it('cuts a long English paragraph back to a word boundary within 200 characters', () => {
		const paragraph = Array.from({ length: 52 }, (_, index) => `word${index % 10}`).join(' ')
		const excerpt = extractTopicExcerpt(`## Topic: Long\n\n${paragraph}\n`, 'en')
		const kept = excerpt.slice(0, -1)

		expect(paragraph.length).toBeGreaterThan(260)
		expect(excerpt.endsWith('…')).toBe(true)
		expect(kept.length).toBeLessThanOrEqual(200)
		expect(kept.length).toBeGreaterThanOrEqual(150)
		expect(paragraph.startsWith(kept)).toBe(true)
		expect(paragraph[kept.length]).toBe(' ')
	})

	it('is empty when the post has no topic section, or nothing to quote in it', () => {
		expect(extractTopicExcerpt('## 封面图\n\n很长很长很长很长很长很长很长很长很长很长的一段。\n', 'zh')).toBe('')
		expect(extractTopicExcerpt('## 话题：空\n\n![只有图](https://example.com/a.webp)\n', 'zh')).toBe('')
	})
})

describe('truncateExcerpt', () => {
	it('leaves a short text alone, without an ellipsis', () => {
		expect(truncateExcerpt('一段真正的摘要', 'zh')).toBe('一段真正的摘要')
	})

	it('does not leave a comma in front of the ellipsis', () => {
		expect(truncateExcerpt(`${'测'.repeat(89)}，${'试'.repeat(30)}`, 'zh')).toBe(`${'测'.repeat(89)}…`)
	})

	it('counts code points, so an emoji is never split', () => {
		const text = `${'测'.repeat(89)}😆${'试'.repeat(10)}`
		expect(truncateExcerpt(text, 'zh')).toBe(`${'测'.repeat(89)}😆…`)
	})
})

describe('extractCoverImage', () => {
	const dimensions = {
		'https://cdn.example/cover.webp': { width: 1502, height: 1996 },
		'https://cdn.example/elsewhere.webp': { width: 800, height: 600 },
	}
	const post = `开头。\n\n![不是封面](https://cdn.example/elsewhere.webp)\n\n## 封面图\n\n![雷伊拼豆](https://cdn.example/cover.webp)\n\n![第二张](https://cdn.example/second.webp)\n\n## 话题：x\n`

	it('takes the first image under the cover heading when the manifest knows its size', () => {
		expect(extractCoverImage(post, dimensions, '标题')).toEqual({
			src: 'https://cdn.example/cover.webp',
			alt: '雷伊拼豆',
			width: 1502,
			height: 1996,
			ratioWide: 0.8,
			ratioNarrow: 1,
			wide: false,
		})
	})

	it('reads the English cover heading', () => {
		const english = post.replace('## 封面图', '## Cover Image')
		expect(extractCoverImage(english, dimensions, 'Title')?.src).toBe('https://cdn.example/cover.webp')
	})

	it('has no cover when the image is missing from the manifest', () => {
		expect(extractCoverImage(post, {}, '标题')).toBeNull()
	})

	it('has no cover without a cover section, even if another image is known', () => {
		expect(extractCoverImage(post.replace('## 封面图', '## 有趣'), dimensions, '标题')).toBeNull()
	})

	it('falls back to the title for an image without alt text', () => {
		expect(extractCoverImage(post.replace('雷伊拼豆', ''), dimensions, '标题')?.alt).toBe('标题')
	})
})

describe('coverShape', () => {
	it.each([
		[1152, 2048, 0.8, 1, false],
		[1280, 576, 1.5, 1.5, true],
		[1434, 1080, 1434 / 1080, 1434 / 1080, true],
		[960, 960, 1, 1, false],
	])('shapes a %d×%d cover', (width, height, ratioWide, ratioNarrow, wide) => {
		const shape = coverShape(width, height)
		expect(shape.ratioWide).toBeCloseTo(ratioWide)
		expect(shape.ratioNarrow).toBeCloseTo(ratioNarrow)
		expect(shape.wide).toBe(wide)
	})
})

describe('groupByYear', () => {
	it('keeps the input order and yields each year once, newest first', () => {
		const entries = [
			{ year: 2026, slug: 'd' },
			{ year: 2024, slug: 'c' },
			{ year: 2024, slug: 'b' },
			{ year: 2022, slug: 'a' },
		]
		expect(groupByYear(entries)).toEqual([
			{ year: 2026, entries: [entries[0]] },
			{ year: 2024, entries: [entries[1], entries[2]] },
			{ year: 2022, entries: [entries[3]] },
		])
	})
})

describe('fillTemplate', () => {
	it('fills every named slot and leaves unknown ones visible', () => {
		expect(fillTemplate('第 {first}–{last} 期', { first: 1, last: 23 })).toBe('第 1–23 期')
		expect(fillTemplate('No. {n}: {missing}', { n: 5 })).toBe('No. 5: {missing}')
	})
})

describe('formatIssueRange', () => {
	const templates = { IssueN: '第 {n} 期', IssueRange: '第 {first}–{last} 期' }

	it('prints the run of numbers, or one number while the run has only one', () => {
		expect(formatIssueRange(templates, { first: 1, last: 23 })).toBe('第 1–23 期')
		expect(formatIssueRange(templates, { first: 1, last: 1 })).toBe('第 1 期')
	})

	it('prints nothing while no issue carries a number', () => {
		expect(formatIssueRange(templates, { first: null, last: null })).toBeNull()
	})
})
