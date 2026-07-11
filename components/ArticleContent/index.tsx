import type { ReactNode } from 'react'
import ImageLightbox from './ImageLightbox'

interface ArticleContentProps {
	content: ReactNode
	containerId: string
	openLabel?: string
}

export default function ArticleContent({
	content,
	containerId,
	openLabel,
}: ArticleContentProps) {
	return (
		<>
			<div id={containerId} className="article-content">
				{content}
			</div>
			<ImageLightbox containerId={containerId} openLabel={openLabel} />
		</>
	)
}
