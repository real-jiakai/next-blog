'use client'

import { useEffect, useState } from 'react'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

export default function ScrollToTop({ label }: { label: string }) {
	const [isVisible, setIsVisible] = useState(false)

	const scrollToTop = () => {
		// The button unmounts once the page is back at the top. Move focus to the
		// header first, or it falls to <body> and the next Tab resumes from where
		// the button was, at the foot of the page.
		document.querySelector<HTMLElement>('header a[href]')?.focus({ preventScroll: true })
		window.scrollTo({
			top: 0,
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
		})
	}

	useEffect(() => {
		const toggleVisibility = () => setIsVisible(window.scrollY > 300)

		window.addEventListener('scroll', toggleVisibility, { passive: true })
		// A reload or back navigation can restore the scroll position before the
		// listener exists, so check once now rather than wait for the next scroll.
		toggleVisibility()

		return () => {
			window.removeEventListener('scroll', toggleVisibility)
		}
	}, [])

	return (
		isVisible && (
			<div className="fixed bottom-2 right-2 hidden md:block">
				<button
					type="button"
					aria-label={label}
					title={label}
					onClick={scrollToTop}
					className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-[#f4f4f5] bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-500 ease-in-out transform-gpu motion-reduce:transition-none"
				>
					<KeyboardArrowUpIcon aria-hidden />
				</button>
			</div>
		)
	)
}
