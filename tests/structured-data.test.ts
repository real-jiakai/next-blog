import { describe, expect, it } from 'vitest'
import { blogPostingJsonLd, serializeJsonLd, webSiteJsonLd } from '@/lib/structured-data'

const issue = {
	lang: 'zh' as const,
	url: 'https://example.com/2026/01/weekly-issue-23',
	title: '站在校园与社会的十字路口 #23',
	description: '一句摘要。',
	datePublished: '2026-01-23',
	site: { name: '周见', url: 'https://example.com/' },
}

describe('structured data', () => {
	it('describes an issue as a BlogPosting by the periodical\'s author', () => {
		expect(blogPostingJsonLd({ ...issue, image: 'https://cdn.example.com/cover.webp' })).toEqual({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: '站在校园与社会的十字路口 #23',
			description: '一句摘要。',
			url: issue.url,
			mainEntityOfPage: issue.url,
			datePublished: '2026-01-23',
			dateModified: '2026-01-23',
			inLanguage: 'zh-CN',
			author: { '@type': 'Person', name: 'Jiakai Gu', url: 'https://github.com/real-jiakai' },
			image: ['https://cdn.example.com/cover.webp'],
			isPartOf: { '@type': 'WebSite', name: '周见', url: 'https://example.com/' },
		})
	})

	it('dates the last change by a recorded revision, and leaves out a missing image', () => {
		const data = blogPostingJsonLd({ ...issue, lang: 'en', dateModified: '2026-03-01' })

		expect(data.dateModified).toBe('2026-03-01')
		expect(data.inLanguage).toBe('en')
		expect(data).not.toHaveProperty('image')
	})

	it('describes the site for its home page', () => {
		expect(webSiteJsonLd({ lang: 'en', name: '周见', url: 'https://example.com/en', description: 'About.' })).toEqual({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: '周见',
			url: 'https://example.com/en',
			description: 'About.',
			inLanguage: 'en',
		})
	})

	it('cannot be closed early by a string in the data', () => {
		const json = serializeJsonLd({ description: 'a </script><script>alert(1)</script> b' })

		expect(json).not.toContain('<')
		expect(JSON.parse(json)).toEqual({ description: 'a </script><script>alert(1)</script> b' })
	})
})
