import dayjs from 'dayjs'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import type { Locale } from '@/lib/i18n-config'

const dayjsLocales: Record<Locale, string> = {
	en: 'en',
	zh: 'zh-cn',
}

const intlLocales: Record<Locale, string> = {
	en: 'en-US',
	zh: 'zh-CN',
}

/**
 * Format dates consistently without changing Day.js's process-wide locale.
 * Date-only values are parsed in local time so they cannot roll back a day in
 * time zones west of UTC.
 */
export function formatDate(
	dateString: string,
	locale: Locale,
	format?: string
): string {
	const date = dayjs(dateString).locale(dayjsLocales[locale])

	if (!date.isValid()) {
		return dateString
	}

	if (format) {
		return date.format(format)
	}

	return new Intl.DateTimeFormat(intlLocales[locale], {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(date.toDate())
}
