'use client'

import Lightbox, { type Labels } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'

export interface LightboxSlide {
	src: string
	alt?: string
	description?: string
}

interface LightboxDialogProps {
	open: boolean
	close: () => void
	index: number
	slides: LightboxSlide[]
	labels?: Labels
}

export default function LightboxDialog({
	open,
	close,
	index,
	slides,
	labels,
}: LightboxDialogProps) {
	return (
		<Lightbox
			open={open}
			close={close}
			index={index}
			slides={slides}
			labels={labels}
			plugins={[Zoom, Captions]}
			zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
			captions={{ showToggle: true, descriptionTextAlign: 'center' }}
			carousel={{ finite: slides.length <= 1 }}
			controller={{ closeOnBackdropClick: true }}
			styles={{ container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' } }}
		/>
	)
}
