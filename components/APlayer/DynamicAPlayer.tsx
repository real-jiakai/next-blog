'use client'

import dynamic from 'next/dynamic'

const APlayer = dynamic(() => import('./index'), {
	ssr: false,
	loading: () => (
		<div
			className="my-4 h-16 animate-pulse rounded bg-site-surface-muted"
			aria-hidden="true"
		/>
	),
})

interface AudioData {
	name: string
	artist: string
	url: string
	cover?: string
	lrc?: string
}

interface DynamicAPlayerProps {
	audio: AudioData
	loadingLabel: string
	fallbackLabel: string
}

export default function DynamicAPlayer({
	audio,
	loadingLabel,
	fallbackLabel,
}: DynamicAPlayerProps) {
	return (
		<APlayer
			audio={audio}
			loadingLabel={loadingLabel}
			fallbackLabel={fallbackLabel}
		/>
	)
}
