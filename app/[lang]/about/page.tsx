import type { Metadata } from 'next'
import { getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import Layout from '@/components/Layout'

export async function generateMetadata({
	params,
}: {
  params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	const dict = await getDictionary(lang)

	return {
		title: dict.about.About,
		description: dict.about.Intro,
		alternates: {
			canonical: getLocalePath(lang, '/about'),
			languages: {
				'zh-CN': '/about',
				'en-US': '/en/about',
				'x-default': '/about',
			},
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: {
			type: 'website',
			title: dict.about.About,
			description: dict.about.Intro,
			url: getLocalePath(lang, '/about'),
			siteName: process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog',
			locale: lang === 'zh' ? 'zh_CN' : 'en_US',
			alternateLocale: lang === 'zh' ? ['en_US'] : ['zh_CN'],
		},
	}
}

export default async function About({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)

	const rssUrl = lang === 'zh' ? '/index.xml' : '/en/index.xml'
	const wordSpace = lang === 'en' ? ' ' : ''
	const personalSiteUrl = 'https://github.com/real-jiakai'

	return (
		<Layout lang={lang} dict={dict}>
			<div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
				<h1 className="text-center my-3">{dict.about.About}</h1>
				<p className="my-4">{dict.about.Intro}</p>
				<p className="my-4">{dict.about.WeeklyName}</p>
				<p className="my-4">
					{dict.about.RSSSubscribe}
					{wordSpace}
					<a
						href={rssUrl}
						type="application/atom+xml"
						className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					>
						{dict.about.RSSLink}
					</a>
					{dict.about.RSSSubscribeEnd}
				</p>
				<p className="my-4">
					{dict.about.MoreAboutMe}
					{wordSpace}
					<a
						href={personalSiteUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					>
						{dict.about.Blog}
					</a>
					{dict.about.MoreAboutMeEnd}
				</p>
			</div>
		</Layout>
	)
}
