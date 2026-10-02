'use client'

import dynamic from 'next/dynamic'

const APlayer = dynamic(() => import('./index'), {
	ssr: false,
	loading: () => (
		<div
			className="mt-4 h-[68px] animate-pulse bg-site-surface-muted"
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
	playLabel: string
}

export default function DynamicAPlayer({
	audio,
	loadingLabel,
	fallbackLabel,
	playLabel,
}: DynamicAPlayerProps) {
	return (
		<APlayer
			audio={audio}
			loadingLabel={loadingLabel}
			fallbackLabel={fallbackLabel}
			playLabel={playLabel}
		/>
	)
}
