import { Locale, getLocalePath } from '@/lib/i18n-config'
import { getSortedPostsData, PostData } from '@/lib/posts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gujiakai.top'
const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || '周见'
const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '专注于分享互联网上有趣的东西。'

export const dynamic = 'force-static'

function postLine(post: PostData, locale: Locale): string {
	const [year, month] = post.date.split('-')
	const url = `${baseUrl}${getLocalePath(locale, `/${year}/${month}/${post.slug}`)}`
	return `- [${post.title}](${url}): ${post.summary}`
}

export function GET() {
	const zhPosts = getSortedPostsData('zh')
	const enPosts = getSortedPostsData('en')

	const content = [
		`# ${siteTitle}`,
		'',
		`> \`${siteTitle}\` is a bilingual (Chinese/English) personal weekly blog by Gu Jiakai. ${siteDescription}`,
		'',
		'## Main Sections',
		'',
		`- [Home](${baseUrl}/): Home page`,
		`- [Archive](${baseUrl}/archive): Archive of all posts`,
		`- [About](${baseUrl}/about): About page`,
		`- [RSS](${baseUrl}/index.xml): RSS feed`,
		`- [English Home](${baseUrl}/en): Home page (English)`,
		`- [English Archive](${baseUrl}/en/archive): Archive of all posts (English)`,
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
