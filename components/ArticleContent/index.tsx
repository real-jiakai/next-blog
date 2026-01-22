'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'

interface ArticleContentProps {
	contentHtml: string
}

interface LightboxSlide {
	src: string
	alt?: string
	description?: string
}

export default function ArticleContent({ contentHtml }: ArticleContentProps) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [lightboxIndex, setLightboxIndex] = useState(0)
	const [slides, setSlides] = useState<LightboxSlide[]>([])

	const handleImageClick = useCallback((e: MouseEvent) => {
		const target = e.target as HTMLElement
		if (target.tagName === 'IMG') {
			const img = target as HTMLImageElement
			const images = contentRef.current?.querySelectorAll('img')
			if (images) {
				const imageArray = Array.from(images)
				const index = imageArray.indexOf(img)
				if (index !== -1) {
					setLightboxIndex(index)
					setLightboxOpen(true)
				}
			}
		}
	}, [])

	useEffect(() => {
		const contentEl = contentRef.current
		if (!contentEl) return

		// Collect all images and create slides
		const images = contentEl.querySelectorAll('img')
		const slideData: LightboxSlide[] = Array.from(images).map((img) => ({
			src: img.src,
			alt: img.alt || undefined,
			description: img.alt || undefined,
		}))
		setSlides(slideData)

		// Add click event listener
		contentEl.addEventListener('click', handleImageClick)

		return () => {
			contentEl.removeEventListener('click', handleImageClick)
		}
	}, [contentHtml, handleImageClick])

	return (
		<>
			<div
				ref={contentRef}
				dangerouslySetInnerHTML={{ __html: contentHtml }}
				className="article-content"
			/>
			<Lightbox
				open={lightboxOpen}
				close={() => setLightboxOpen(false)}
				index={lightboxIndex}
				slides={slides}
				plugins={[Zoom, Captions]}
				zoom={{
					maxZoomPixelRatio: 3,
					scrollToZoom: true,
				}}
				captions={{
					showToggle: true,
					descriptionTextAlign: 'center',
				}}
				carousel={{
					finite: slides.length <= 1,
				}}
				controller={{
					closeOnBackdropClick: true,
				}}
				styles={{
					container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
				}}
			/>
		</>
	)
}
