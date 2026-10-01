'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Labels } from 'yet-another-react-lightbox'
import type { LightboxSlide } from './LightboxDialog'

// The viewer and its stylesheet are fetched on first use, so posts without
// images (and readers who never open one) do not pay for them.
const LightboxDialog = dynamic(() => import('./LightboxDialog'), { ssr: false })

interface ImageLightboxProps {
  containerId: string
  openLabel?: string
  lightboxLabels?: Labels
}

/**
 * Adds optional client-side lightbox behavior to images that were rendered by
 * the ArticleContent Server Component. Linked images keep their native link
 * behavior; standalone images become keyboard-operable dialog triggers.
 */
export default function ImageLightbox({
	containerId,
	openLabel = 'Enlarge image',
	lightboxLabels,
}: ImageLightboxProps) {
	const [hasOpened, setHasOpened] = useState(false)
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
			setHasOpened(true)
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

		// Start fetching the viewer as soon as a pointer or focus reaches an
		// image, ahead of the click that opens it.
		const preload = (event: Event) => {
			const target = event.target
			if (target instanceof HTMLImageElement && target.dataset.lightboxImage) {
				void import('./LightboxDialog')
			}
		}

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

		container.addEventListener('pointerover', preload)
		container.addEventListener('focusin', preload)
		container.addEventListener('click', handleClick)
		container.addEventListener('keydown', handleKeyDown)

		return () => {
			cancelAnimationFrame(frameId)
			container.removeEventListener('pointerover', preload)
			container.removeEventListener('focusin', preload)
			container.removeEventListener('click', handleClick)
			container.removeEventListener('keydown', handleKeyDown)
		}
	}, [containerId, openImage, openLabel])

	// Stays mounted after the first open so the close animation can run.
	if (!hasOpened || slides.length === 0) {
		return null
	}

	return (
		<LightboxDialog
			open={lightboxOpen}
			close={() => setLightboxOpen(false)}
			index={lightboxIndex}
			slides={slides}
			labels={lightboxLabels}
		/>
	)
}
