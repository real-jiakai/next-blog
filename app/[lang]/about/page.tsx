import type { Metadata } from 'next'
import { Locale } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import Layout from '@/components/Layout'

export const metadata: Metadata = {
	title: 'About',
}

export default async function About({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)

	const rssUrl = lang === 'zh'
		? 'https://gujiakai.top/index.xml'
		: 'https://gujiakai.top/en/index.xml'

	return (
		<Layout lang={lang} dict={dict}>
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<h1 className="text-center my-3">{dict.about.About}</h1>
				<p className="my-4">{dict.about.Intro}</p>
				<p className="my-4">{dict.about.WeeklyName}</p>
				<p className="my-4">
					{dict.about.RSSSubscribe}
					<a
						href={rssUrl}
						target="_blank"
						className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
					>
						{dict.about.RSSLink}
					</a>
					{dict.about.RSSSubscribeEnd}
				</p>
				<p className="my-4">
					{dict.about.MoreAboutMe}
					<a
						href="https://blog.gujiakai.top"
						target="_blank"
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
