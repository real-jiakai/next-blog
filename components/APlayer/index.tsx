'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import '@/public/css/APlayer.min.css'

interface AudioData {
	name: string
	artist: string
	url: string
	cover?: string
	lrc?: string
}

interface APlayerProps {
	audio: AudioData
	loadingLabel: string
	fallbackLabel: string
}

declare global {
  interface Window {
    APlayer: new (options: {
      container: HTMLElement
      audio: AudioData[]
      autoplay?: boolean
      theme?: string
      loop?: string
      order?: string
      preload?: string
      volume?: number
      mutex?: boolean
      lrcType?: number
    }) => {
      destroy: () => void
    }
  }
}

export default function APlayer({
	audio,
	loadingLabel,
	fallbackLabel,
}: APlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const playerRef = useRef<{ destroy: () => void } | null>(null)
	const [scriptStatus, setScriptStatus] = useState<'loading' | 'ready' | 'error'>(() => (
		typeof window !== 'undefined' && window.APlayer ? 'ready' : 'loading'
	))

	useEffect(() => {
		if (!audio || !containerRef.current || scriptStatus !== 'ready' || !window.APlayer) {
			return
		}

		let failureTimer: number | undefined

		try {
			playerRef.current = new window.APlayer({
				container: containerRef.current,
				audio: [audio],
				autoplay: false,
				theme: '#b7daff',
				loop: 'none',
				order: 'list',
				preload: 'metadata',
				volume: 0.7,
				mutex: true,
				lrcType: 0,
			})
		} catch (error) {
			console.error('APlayer initialization failed:', error)
			failureTimer = window.setTimeout(() => setScriptStatus('error'), 0)
		}

		return () => {
			if (failureTimer !== undefined) {
				window.clearTimeout(failureTimer)
			}
			if (playerRef.current) {
				playerRef.current.destroy()
				playerRef.current = null
			}
		}
	}, [audio, scriptStatus])

	if (!audio) {
		return null
	}

	return (
		<>
			<Script
				id="aplayer-script"
				src="/js/APlayer.min.js"
				strategy="lazyOnload"
				onLoad={() => setScriptStatus('ready')}
				onReady={() => setScriptStatus('ready')}
				onError={() => setScriptStatus('error')}
			/>
			{scriptStatus === 'loading' && (
				<div
					className="my-4 h-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
					role="status"
					aria-label={`${loadingLabel}: ${audio.name}`}
				/>
			)}
			{scriptStatus === 'error' && (
				<a
					href={audio.url}
					className="my-4 inline-flex rounded-lg border border-gray-200 px-4 py-2 text-blue-600 dark:border-gray-700 dark:text-blue-400"
					aria-label={`${fallbackLabel}: ${audio.name} — ${audio.artist}`}
				>
					{audio.name} — {audio.artist}
				</a>
			)}
			<div
				ref={containerRef}
				className={scriptStatus === 'ready' ? 'aplayer-container my-4' : 'hidden'}
			/>
		</>
	)
}
