import 'server-only'

import { createHash } from 'node:crypto'
import Identicon from 'identicon.js'

// The same MD5-seeded identicon the browser used to draw with crypto-js, so
// every commenter keeps the avatar they already had. The SVG is resolution
// independent; its 64px intrinsic size is kept only to keep the bytes equal.
export function getCommentAvatar(username: string): string {
	const hash = createHash('md5').update(username, 'utf8').digest('hex')
	const svg = new Identicon(hash, { size: 64, format: 'svg' }).toString(true)
	return `data:image/svg+xml;base64,${Buffer.from(svg, 'latin1').toString('base64')}`
}
