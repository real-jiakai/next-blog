'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import './APlayer.min.css'

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
	playLabel: string
}

interface APlayerInstance {
	destroy: () => void
	toggle: () => void
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
    }) => APlayerInstance
  }
}

// APlayer's normal mode only starts playback from a click on the cover, a
// plain <div>; make it a focusable, named button that answers Enter and Space.
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-site-accent'

function makeCoverOperable(
	container: HTMLElement,
	player: APlayerInstance,
	label: string
) {
	const cover = container.querySelector<HTMLElement>('.aplayer-pic')
	if (!cover) return
	cover.tabIndex = 0
	cover.setAttribute('role', 'button')
	cover.setAttribute('aria-label', label)
	cover.classList.add(...FOCUS_RING.split(' '))
	cover.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			player.toggle()
		}
	})
}

export default function APlayer({
	audio,
	loadingLabel,
	fallbackLabel,
	playLabel,
}: APlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const playerRef = useRef<APlayerInstance | null>(null)
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
			// destroy() empties the container, which also drops this listener.
			makeCoverOperable(
				containerRef.current,
				playerRef.current,
				`${playLabel}: ${audio.name} — ${audio.artist}`
			)
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
	}, [audio, scriptStatus, playLabel])

	if (!audio) {
		return null
	}

	// next/script swallows a failed load into a resolved promise, so later
	// mounts get onLoad/onReady even though the global was never defined.
	const markLoaded = () => setScriptStatus(window.APlayer ? 'ready' : 'error')

	return (
		<>
			<Script
				id="aplayer-script"
				src="/js/APlayer.min.js"
				strategy="lazyOnload"
				onLoad={markLoaded}
				onReady={markLoaded}
				onError={() => setScriptStatus('error')}
			/>
			{scriptStatus === 'loading' && (
				// The player's own size and corners, so nothing moves when it
				// replaces this.
				<div
					className="mt-4 h-[68px] animate-pulse bg-site-surface-muted"
					role="status"
					aria-label={`${loadingLabel}: ${audio.name}`}
				/>
			)}
			{scriptStatus === 'error' && (
				<a
					href={audio.url}
					className="mt-4 inline-flex rounded border border-site-line px-4 py-2 text-site-accent underline underline-offset-4 transition-colors hover:text-site-accent-strong"
					aria-label={`${fallbackLabel}: ${audio.name} — ${audio.artist}`}
				>
					{audio.name} — {audio.artist}
				</a>
			)}
			<div
				ref={containerRef}
				className={scriptStatus === 'ready' ? 'aplayer-container' : 'hidden'}
			/>
		</>
	)
}
