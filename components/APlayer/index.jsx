import { useEffect, useRef, useState } from 'react'

export default function APlayer({ audio }) {
	const containerRef = useRef(null)
	const playerRef = useRef(null)
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		// 确保在客户端环境
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (!isClient || !audio || !containerRef.current) {
			return
		}

		// 清理之前的播放器实例
		if (playerRef.current) {
			playerRef.current.destroy()
			playerRef.current = null
		}

		// 等待 APlayer 脚本加载完成
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
				// APlayer 还未加载完成，重试
				setTimeout(initPlayer, 200)
			}
		}

		// 延迟初始化，确保 DOM 完全准备就绪
		const timer = setTimeout(initPlayer, 100)

		return () => {
			clearTimeout(timer)
			if (playerRef.current) {
				playerRef.current.destroy()
				playerRef.current = null
			}
		}
	}, [isClient, audio])

	// 在服务端渲染时不显示任何内容
	if (!isClient || !audio) {
		return null
	}

	return <div ref={containerRef} className="aplayer-container my-4" />
}