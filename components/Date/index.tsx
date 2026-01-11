import dayjs from 'dayjs'

interface DateProps {
  dateString: string
  format?: string
}

export default function Date({ dateString, format = 'MMMM D, YYYY' }: DateProps) {
	const date = dayjs(dateString)
	return <time dateTime={dateString}>{date.format(format)}</time>
}
