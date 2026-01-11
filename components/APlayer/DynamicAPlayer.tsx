'use client'

import dynamic from 'next/dynamic'

const APlayer = dynamic(() => import('./index'), {
	ssr: false,
	loading: () => (
		<div className="aplayer-loading my-4 p-4 text-center">Loading APlayer...</div>
	),
})

interface AudioData {
  name: string
  artist: string
  url: string
  cover?: string
  lrc?: string
}

export default function DynamicAPlayer({ audio }: { audio: AudioData }) {
	return <APlayer audio={audio} />
}
