'use client'

import { useEffect, useState } from 'react'
import { KeyboardArrowUpIcon } from '@/components/Icons'
import { returnToTop, trackScrolledDown } from '@/components/ScrollToTop/interaction'

/**
 * A plain square in the corner, from md up, once the reader is a screen
 * down the page.
 */
export default function ScrollToTop({ label }: { label: string }) {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => trackScrolledDown(window, setIsVisible), [])

	return (
		isVisible && (
			<button
				type="button"
				aria-label={label}
				title={label}
				onClick={() => returnToTop(window)}
				className="fixed bottom-6 right-6 hidden size-11 items-center justify-center rounded border border-site-line bg-site-surface text-site-heading transition-colors hover:bg-site-surface-muted md:inline-flex"
			>
				<KeyboardArrowUpIcon size={24} />
			</button>
		)
	)
}
