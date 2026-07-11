import type { Locale } from '@/lib/i18n-config'
import { formatDate } from '@/lib/formatDate'

interface DateProps {
  dateString: string
  format?: string
  locale?: Locale
}

export default function Date({ dateString, format, locale = 'en' }: DateProps) {
	return <time dateTime={dateString}>{formatDate(dateString, locale, format)}</time>
}
