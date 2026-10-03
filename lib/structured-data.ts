import type { Locale } from '@/lib/i18n-config'
import { siteAuthor } from '@/lib/site-config'

// schema.org descriptions of the site and its issues, rendered as JSON-LD.
// Every field comes from data the page already shows or declares in its
// meta tags; nothing here is written only for search engines.

const languageTags: Record<Locale, string> = { zh: 'zh-CN', en: 'en' }

interface BlogPostingInput {
	lang: Locale
	// The canonical, absolute URL of the issue.
	url: string
	// The frontmatter title, number included, as <title> carries it.
	title: string
	description: string
	datePublished: string
	// The last substantive revision, if the post records one.
	dateModified?: string | null
	// An absolute image URL, the same one og:image names.
	image?: string
	site: { name: string, url: string }
}

/** An issue as a BlogPosting by the periodical's author. */
export function blogPostingJsonLd(input: BlogPostingInput) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: input.title,
		description: input.description,
		url: input.url,
		mainEntityOfPage: input.url,
		datePublished: input.datePublished,
		dateModified: input.dateModified ?? input.datePublished,
		inLanguage: languageTags[input.lang],
		author: { '@type': 'Person', name: siteAuthor.name, url: siteAuthor.url },
		...(input.image ? { image: [input.image] } : {}),
		isPartOf: { '@type': 'WebSite', name: input.site.name, url: input.site.url },
	}
}

/** The site itself, for its home page in each language. */
export function webSiteJsonLd(input: { lang: Locale, name: string, url: string, description: string }) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: input.name,
		url: input.url,
		description: input.description,
		inLanguage: languageTags[input.lang],
	}
}

/**
 * JSON for a <script type="application/ld+json">. Every `<` is escaped, so no
 * string in the data (a summary, say) can close the element early.
 */
export function serializeJsonLd(data: object): string {
	return JSON.stringify(data).replace(/</g, '\\u003c')
}
