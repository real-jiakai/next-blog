import { serializeJsonLd } from '@/lib/structured-data'

/** Structured data for the page, as a JSON-LD script block. */
export default function JsonLd({ data }: { data: object }) {
	return (
		<script
			type="application/ld+json"
			// Data, not markup: serializeJsonLd escapes every `<`.
			dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
		/>
	)
}
