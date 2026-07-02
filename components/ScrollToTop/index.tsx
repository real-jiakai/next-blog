'use client'

import { useEffect, useState } from 'react'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

export default function ScrollToTop() {
	const [isVisible, setIsVisible] = useState(false)

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}

	useEffect(() => {
		const toggleVisibility = () => {
			if (window.pageYOffset > 300) {
				setIsVisible(true)
			} else {
				setIsVisible(false)
			}
		}

		window.addEventListener('scroll', toggleVisibility)

		return () => {
			window.removeEventListener('scroll', toggleVisibility)
		}
	}, [])

	return (
		isVisible && (
			<div className="fixed bottom-2 right-2">
				<button
					type="button"
					aria-label="Scroll to top"
					onClick={scrollToTop}
					className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-500 ease-in-out transform-gpu"
				>
					<KeyboardArrowUpIcon />
				</button>
			</div>
		)
	)
}
