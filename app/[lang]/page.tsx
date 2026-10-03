import type { Metadata } from 'next'
import Link from 'next/link'
import { Locale, getLanguageAlternates, getLocalePath } from '@/lib/i18n-config'
import { getDictionary } from '@/lib/dictionaries'
import { getSiteOpenGraph } from '@/lib/metadata'
import { getIssueIndex, getIssueStats } from '@/lib/posts'
import { getSiteDescription, getSiteTitle, getSiteUrl } from '@/lib/site-config'
import { webSiteJsonLd } from '@/lib/structured-data'
import JsonLd from '@/components/JsonLd'
import Layout from '@/components/Layout'
import Masthead from '@/components/Masthead'
import LeadIssue from '@/components/LeadIssue'
import IssueIndex from '@/components/IssueIndex'

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: Locale }>
}): Promise<Metadata> {
	const { lang } = await params
	const dict = await getDictionary(lang)
	return {
		// The name alone says nothing to someone who does not know it yet, so
		// the contents page adds what the site is, in the template's form.
		title: { absolute: `${getSiteTitle(lang)} | ${dict.common.Tagline}` },
		alternates: {
			canonical: getLocalePath(lang),
			languages: getLanguageAlternates(),
			types: {
				'application/atom+xml': lang === 'en' ? '/en/index.xml' : '/index.xml',
			},
		},
		openGraph: getSiteOpenGraph(lang, ''),
	}
}

/**
 * The periodical's contents page: a masthead, the newest issue as the lead,
 * and every earlier issue by year. It is the complete list; there is no
 * pagination and no separate archive.
 */
export default async function Home({
	params,
}: {
	params: Promise<{ lang: Locale }>
}) {
	const { lang } = await params
	const dict = await getDictionary(lang)
	const issues = getIssueIndex(lang)
	const stats = getIssueStats(lang)
	const [lead, ...back] = issues
	const structuredData = webSiteJsonLd({
		lang,
		name: getSiteTitle('zh'),
		url: `${getSiteUrl()}${getLocalePath(lang)}`,
		description: getSiteDescription(lang),
	})

	if (!lead) {
		// Point at the other locale's contents, in that locale's own words.
		const other: Locale = lang === 'en' ? 'zh' : 'en'
		const otherDict = await getDictionary(other)
		return (
			<Layout lang={lang} dict={dict}>
				<JsonLd data={structuredData} />
				<div className="mx-auto w-full max-w-4xl px-4 pb-20 md:px-6">
					<Masthead lang={lang} dict={dict} stats={stats} />
					<p className="m-0 text-[1.0625rem] text-site-muted">
						{dict.common.NoPostsAvailable}
					</p>
					<Link
						href={getLocalePath(other)}
						hrefLang={other}
						lang={other}
						className="mt-4 inline-block border-b-[1.5px] border-current pb-0.5 text-[0.9375rem] font-semibold text-site-accent transition-colors hover:border-transparent"
					>
						{otherDict.common.OtherLocaleContents}
					</Link>
				</div>
			</Layout>
		)
	}

	return (
		<Layout lang={lang} dict={dict}>
			<JsonLd data={structuredData} />
			<div className="mx-auto w-full max-w-4xl px-4 pb-20 md:px-6">
				<Masthead lang={lang} dict={dict} stats={stats} />
				<LeadIssue lang={lang} dict={dict} issue={lead} />
				{back.length > 0 && (
					<IssueIndex lang={lang} dict={dict} issues={back} leadYear={lead.year} />
				)}
			</div>
		</Layout>
	)
}
