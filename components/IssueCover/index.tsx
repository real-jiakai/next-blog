import Image from 'next/image'
import type { IssueCover as IssueCoverData } from '@/lib/issues'

interface IssueCoverProps {
	cover: IssueCoverData
	// The dictionary's word for a cover, which leads the caption.
	coverLabel: string
	className?: string
}

/**
 * The lead issue's cover photograph. The box takes its proportions from the
 * --r-sm / --r-lg custom properties the lead sets from the image's manifest
 * size, so it is laid out before the image arrives, and it stays a tinted
 * panel if the image host cannot be reached.
 */
export default function IssueCover({ cover, coverLabel, className = '' }: IssueCoverProps) {
	return (
		<figure className={`m-0 ${className}`}>
			<div className="relative aspect-(--r-sm) overflow-hidden bg-site-surface-muted lg:aspect-(--r-lg) dark:ring-1 dark:ring-site-line">
				{/* `sizes` is in px only: a vw entry makes Next drop every
				    srcset candidate below 640w, and a 288px column would then be
				    sent a 640px file. 430px is the widest phone box. The ::before
				    only renders if the image fails to load (a loaded image has no
				    pseudo-elements), and covers the browser's broken-image icon
				    so the box stays a plain tinted panel. */}
				<Image
					src={cover.src}
					alt={cover.alt}
					fill
					preload
					sizes="(min-width: 1024px) 288px, (min-width: 640px) 320px, 430px"
					className="object-cover before:absolute before:inset-0 before:bg-site-surface-muted dark:brightness-[.92]"
				/>
			</div>
			<figcaption className="mt-2 px-4 text-[0.75rem] tracking-[0.06em] text-site-muted sm:px-0">
				{coverLabel} · {cover.alt}
			</figcaption>
		</figure>
	)
}
