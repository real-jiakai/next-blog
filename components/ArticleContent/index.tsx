import type { ReactNode } from 'react'
import type { Labels } from 'yet-another-react-lightbox'
import ImageLightbox from './ImageLightbox'

interface ArticleContentProps {
	content: ReactNode
	containerId: string
	openLabel?: string
	lightboxLabels?: Labels
}

export default function ArticleContent({
	content,
	containerId,
	openLabel,
	lightboxLabels,
}: ArticleContentProps) {
	return (
		<>
			<div id={containerId} className="article-content">
				{content}
			</div>
			<ImageLightbox
				containerId={containerId}
				openLabel={openLabel}
				lightboxLabels={lightboxLabels}
			/>
		</>
	)
}
