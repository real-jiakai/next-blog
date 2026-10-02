import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getSortedPostsData, PostData } from '@/lib/posts'
import { getSiteDescription, getSiteTitle } from '@/lib/site-config'

const baseUrl = (
	process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top'
).replace(/\/+$/, '')
// The file is written in English: the heading takes the English title
// (`周见 · Zhōu Jiàn`), and the summary names the brand and its romanisation.
const brand = getSiteTitle('zh')
const englishTitle = getSiteTitle('en')
const siteDescription = getSiteDescription('en')

export const dynamic = 'force-static'

function postLine(post: PostData, locale: Locale): string {
	const [year, month] = post.date.split('-')
	const path = `/${year}/${month}/${encodeURIComponent(post.slug)}`
	const url = `${baseUrl}${getLocalePath(locale, path)}`
	return `- [${post.title}](${url}): ${post.summary}`
}

export function GET() {
	const zhPosts = getSortedPostsData('zh')
	const enPosts = getSortedPostsData('en')

	const content = [
		`# ${englishTitle}`,
		'',
		`> \`${brand}\` (Zhōu Jiàn) is a bilingual (Chinese/English) web periodical by Gu Jiakai. ${siteDescription}`,
		'',
		'## Main Sections',
		'',
		`- [Home](${baseUrl}/): Contents page listing every issue`,
		`- [About](${baseUrl}/about): About page`,
		`- [RSS](${baseUrl}/index.xml): RSS feed`,
		`- [English Home](${baseUrl}/en): Contents page listing every issue (English)`,
		`- [English About](${baseUrl}/en/about): About page (English)`,
		`- [English RSS](${baseUrl}/en/index.xml): RSS feed (English)`,
		'',
		'## Content',
		'',
		...zhPosts.map((post) => postLine(post, 'zh')),
		'',
		'## English Content',
		'',
		...enPosts.map((post) => postLine(post, 'en')),
		'',
	].join('\n')

	return new Response(content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	})
}
