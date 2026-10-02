import type { Metadata } from 'next'
import { getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import type { Locale } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { formatMonthYear } from '@/lib/formatDate'
import { fillTemplate } from '@/lib/issues'
import { getIssueStats } from '@/lib/posts'
import { getSiteTitle } from '@/lib/site-config'
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
			languages: getLanguageAlternates('/about'),
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: {
			type: 'website',
			title: dict.about.About,
			description: dict.about.Intro,
			url: getLocalePath(lang, '/about'),
			siteName: getSiteTitle('zh'),
			locale: lang === 'zh' ? 'zh_CN' : 'en_US',
			alternateLocale: lang === 'zh' ? ['en_US'] : ['zh_CN'],
		},
		twitter: {
			card: 'summary',
			title: dict.about.About,
			description: dict.about.Intro,
		},
	}
}

// Body copy at the article measure; English sets a little tighter.
const prose = 'm-0 text-[1.0625rem] leading-[1.85] text-site-copy [&:lang(en)]:leading-[1.7]'
const linkClass =
	'text-site-heading underline decoration-site-accent/60 underline-offset-4 transition-colors hover:text-site-accent hover:decoration-site-accent'

// The departments every issue carries, in the order an issue prints them.
const sections = ['Cover', 'Topic', 'Interesting', 'Links', 'Quotes'] as const

export default async function About({
	params,
}: {
  params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const { about } = dict
	const stats = getIssueStats(lang)

	const rssUrl = lang === 'zh' ? '/index.xml' : '/en/index.xml'
	const personalSiteUrl = 'https://github.com/real-jiakai'

	return (
		<Layout lang={lang} dict={dict}>
			<div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
				<div className="max-w-[42rem]">
					<h1 className="m-0 text-[2rem] font-bold tracking-tight text-site-heading md:text-[2.5rem]">
						{about.About}
					</h1>
					<div className="mt-3 border-t-[3px] border-double border-site-rule" />
					<p className={`${prose} mt-8`}>{about.Intro}</p>
					<p className={`${prose} mt-5`}>{about.Name}</p>
					<p className={`${prose} mt-5`}>{about.SectionsIntro}</p>
					<ul role="list" className="m-0 mt-4 list-none border-t border-site-rule p-0">
						{sections.map((key) => (
							<li key={key} className={`${prose} border-b border-site-line py-3`}>
								{about[`Section${key}`]}
							</li>
						))}
					</ul>
					<p className={`${prose} mt-4`}>{about.SectionBGM}</p>
					{stats.count > 0 && stats.firstDate && (
						<p className={`${prose} mt-5`}>
							{fillTemplate(about.Stats, {
								since: formatMonthYear(stats.firstDate, lang),
								count: stats.count,
							})}
						</p>
					)}
					<p className={`${prose} mt-5`}>
						{about.RSSSubscribe}{' '}
						<a
							href={rssUrl}
							type="application/atom+xml"
							className={linkClass}
						>
							{about.RSSLink}
						</a>
						{about.RSSSubscribeEnd}
					</p>
					<p className={`${prose} mt-5`}>
						{about.MoreAboutMe}{' '}
						<a
							href={personalSiteUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={linkClass}
						>
							{about.Blog}
						</a>
						{about.MoreAboutMeEnd}
					</p>
				</div>
			</div>
		</Layout>
	)
}
