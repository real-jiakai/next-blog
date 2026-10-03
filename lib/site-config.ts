import type { Locale } from '@/lib/i18n-config'

// Straight apostrophe on purpose: English copy on this site uses straight
// quotes (AGENTS.md). This default is the meta and Open Graph description and
// the llms.txt summary.
const defaultDescriptions: Record<Locale, string> = {
	zh: '专注于分享互联网上有趣的东西。',
	en: '周见 (Zhōu Jiàn) is Jiakai Gu\'s bilingual periodical of things seen on the internet: one topic per issue, with interesting finds, links and quotes.',
}

/**
 * The site description in a locale: its own setting, then the shared one,
 * then a built-in default. It is the meta and Open Graph description; the
 * contents page's standfirst is a dictionary string instead.
 */
export function getSiteDescription(lang: Locale): string {
	return (
		(lang === 'en'
			? process.env.NEXT_PUBLIC_SITE_DESCRIPTION_EN
			: process.env.NEXT_PUBLIC_SITE_DESCRIPTION_ZH) ||
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
		defaultDescriptions[lang]
	)
}

/**
 * The site's name as a page title. English may add a romanisation
 * (`周见 · Zhōu Jiàn`) and falls back to the brand. The brand itself, which
 * the header, footer, title template and og:site_name show in both
 * languages, is `getSiteTitle('zh')`.
 */
export function getSiteTitle(lang: Locale): string {
	return (
		(lang === 'en' ? process.env.NEXT_PUBLIC_SITE_TITLE_EN : undefined) ||
		process.env.NEXT_PUBLIC_SITE_TITLE ||
		'Blog'
	)
}
