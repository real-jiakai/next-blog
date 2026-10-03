import { describe, expect, it } from 'vitest'
import { i18n } from '@/lib/i18n-config'
import { isBoilerplateSummary } from '@/lib/issues'
import { getSortedPostsData } from '@/lib/posts'

// Each issue's frontmatter `summary` is shown in full under its title on the
// contents page, and is the page's meta description. Nothing shortens it, so
// these bounds keep it to about two lines of a contents row at the narrowest
// desktop width (768px): every current summary measured two lines or fewer
// there, and three or fewer on a 390px phone. Wording, not just length,
// decides the wrap, so a summary near the English maximum may take a third.
const bounds = {
	zh: { min: 20, max: 48, end: /。$/u },
	en: { min: 50, max: 110, end: /[^.]\.$/u },
} as const

describe.each(i18n.locales)('%s issue summaries', (locale) => {
	const posts = getSortedPostsData(locale)
	const { min, max, end } = bounds[locale]

	it.each(posts.map((post) => [post.title, post.summary ?? '']))(
		'%s has a summary of its own that fits a contents row',
		(_title, summary) => {
			expect(isBoilerplateSummary(summary)).toBe(false)
			expect(Array.from(summary).length).toBeGreaterThanOrEqual(min)
			expect(Array.from(summary).length).toBeLessThanOrEqual(max)
			expect(summary).toMatch(end)
			expect(summary).not.toMatch(/…|\.\.\.|[\r\n]/u)
			// Noto Sans SC sets curly quotes full-width inside English text.
			if (locale === 'en') expect(summary).not.toMatch(/[“”‘’]/u)
		},
	)
})
