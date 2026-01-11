'use client'

import { useEffect, useRef } from 'react'

interface AudioData {
  name: string
  artist: string
  url: string
  cover?: string
  lrc?: string
}

interface APlayerProps {
  audio: AudioData
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

export default function APlayer({ audio }: APlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const playerRef = useRef<{ destroy: () => void } | null>(null)

	useEffect(() => {
		if (!audio || !containerRef.current) {
			return
		}

		if (playerRef.current) {
			playerRef.current.destroy()
			playerRef.current = null
		}

		const initPlayer = () => {
			if (typeof window !== 'undefined' && window.APlayer && containerRef.current) {
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
				}
			} else {
				setTimeout(initPlayer, 200)
			}
		}

		const timer = setTimeout(initPlayer, 100)

		return () => {
			clearTimeout(timer)
			if (playerRef.current) {
				playerRef.current.destroy()
				playerRef.current = null
			}
		}
	}, [audio])

	if (!audio) {
		return null
	}

	return <div ref={containerRef} className="aplayer-container my-4" />
}
