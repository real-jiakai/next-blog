import Date from '@/components/Date'
import DynamicAPlayer from '@/components/APlayer/DynamicAPlayer'
import { MusicNoteIcon } from '@/components/Icons'
import type { Locale } from '@/lib/i18n-config'
import type { CommonDictionary } from '@/lib/dictionaries'
import { fillTemplate, parseIssueTitle } from '@/lib/issues'
import type { PostContent } from '@/lib/posts'

interface PostHeaderProps {
	lang: Locale
	dict: { common: CommonDictionary }
	// The frontmatter title, "… #23"; the number is set apart from it here.
	title: string
	date: string
	minutes: number
	audio: PostContent['audio']
}

// "第 {n} 期" around a numeral set in the display serif: the template's text
// on either side of its {n} slot.
function splitIssueTemplate(template: string): [string, string] {
	const [before = '', after = ''] = template.split('{n}')
	return [before, after]
}

/**
 * The top of an issue: a kicker with its number, date and reading time, the
 * title without the number, and the issue's song with its player. No rule
 * closes it: most issues open with a note on their song, which belongs with
 * the player, so the first department's rule closes the two together (see
 * `.article-content > h2:first-child` in app/globals.css). The kicker's
 * number is hidden from assistive technology because the title opens with
 * it, visually hidden, instead.
 */
export default function PostHeader({ lang, dict, title, date, minutes, audio }: PostHeaderProps) {
	const { displayTitle, issue } = parseIssueTitle(title)
	const [before, after] = splitIssueTemplate(dict.common.IssueN)

	return (
		<header className="pb-5">
			<p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] tracking-[0.14em] text-site-muted">
				{issue !== null && (
					<>
						<span aria-hidden className="font-semibold text-site-accent">
							{before}
							<span className="font-display text-[1.125rem] tracking-normal lining-nums tabular-nums">
								{issue}
							</span>
							{after}
						</span>
						<span aria-hidden>·</span>
					</>
				)}
				<Date dateString={date} locale={lang} />
				<span aria-hidden>·</span>
				<span>{minutes} {dict.common.MinuteRead}</span>
			</p>
			<h1 className="m-0 mt-3 text-[2rem] font-bold leading-[1.2] tracking-[-0.01em] text-site-heading text-balance sm:text-[2.5rem] md:text-[2.75rem]">
				{issue !== null && (
					<span className="sr-only">{fillTemplate(dict.common.IssueLabel, { n: issue })}</span>
				)}
				{displayTitle}
			</h1>
			{audio && (
				// The label's trailing colon reads as a pause, not part of the name.
				<section aria-label={dict.common.IssueBGM.replace(/[:：]\s*$/u, '')} className="mt-8">
					<p className="m-0 flex items-center gap-1.5 text-[0.8125rem] font-semibold tracking-[0.14em] text-site-accent">
						<MusicNoteIcon size={16} />
						{dict.common.IssueBGM}
					</p>
					<p className="m-0 mt-1 text-[0.9375rem] text-site-heading">
						{audio.name} — {audio.artist}
					</p>
					<DynamicAPlayer
						audio={audio}
						loadingLabel={dict.common.LoadingAudio}
						fallbackLabel={dict.common.PlayAudioFallback}
						playLabel={dict.common.PlayPauseAudio}
					/>
				</section>
			)}
		</header>
	)
}
