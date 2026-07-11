'use client'

import { useCallback, useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'

interface ImageLightboxProps {
  containerId: string
  openLabel?: string
}

interface LightboxSlide {
  src: string
  alt?: string
  description?: string
}

/**
 * Adds optional client-side lightbox behavior to images that were rendered by
 * the ArticleContent Server Component. Linked images keep their native link
 * behavior; standalone images become keyboard-operable dialog triggers.
 */
export default function ImageLightbox({
	containerId,
	openLabel = 'Enlarge image',
}: ImageLightboxProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [lightboxIndex, setLightboxIndex] = useState(0)
	const [slides, setSlides] = useState<LightboxSlide[]>([])

	const openImage = useCallback((image: HTMLImageElement) => {
		const container = document.getElementById(containerId)
		const images = container
			? Array.from(container.querySelectorAll<HTMLImageElement>('img[data-lightbox-image]'))
			: []
		const index = images.indexOf(image)

		if (index !== -1) {
			setLightboxIndex(index)
			setLightboxOpen(true)
		}
	}, [containerId])

	useEffect(() => {
		const container = document.getElementById(containerId)
		if (!container) {
			return
		}

		const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'))
			.filter((image) => !image.closest('a'))

		for (const image of images) {
			image.dataset.lightboxImage = 'true'
			image.tabIndex = 0
			image.setAttribute('role', 'button')
			image.setAttribute('aria-haspopup', 'dialog')
			image.setAttribute(
				'aria-label',
				image.alt ? `${openLabel}: ${image.alt}` : openLabel
			)
		}

		const frameId = requestAnimationFrame(() => {
			setSlides(images.map((image) => ({
				src: image.currentSrc || image.src,
				alt: image.alt || undefined,
				description: image.alt || undefined,
			})))
		})

		const handleClick = (event: MouseEvent) => {
			const target = event.target
			if (target instanceof HTMLImageElement && target.dataset.lightboxImage) {
				openImage(target)
			}
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target
			if (
				target instanceof HTMLImageElement &&
				target.dataset.lightboxImage &&
				(event.key === 'Enter' || event.key === ' ')
			) {
				event.preventDefault()
				openImage(target)
			}
		}

		container.addEventListener('click', handleClick)
		container.addEventListener('keydown', handleKeyDown)

		return () => {
			cancelAnimationFrame(frameId)
			container.removeEventListener('click', handleClick)
			container.removeEventListener('keydown', handleKeyDown)
		}
	}, [containerId, openImage, openLabel])

	if (slides.length === 0) {
		return null
	}

	return (
		<Lightbox
			open={lightboxOpen}
			close={() => setLightboxOpen(false)}
			index={lightboxIndex}
			slides={slides}
			plugins={[Zoom, Captions]}
			zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
			captions={{ showToggle: true, descriptionTextAlign: 'center' }}
			carousel={{ finite: slides.length <= 1 }}
			controller={{ closeOnBackdropClick: true }}
			styles={{ container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' } }}
		/>
	)
}
