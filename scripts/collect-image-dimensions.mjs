#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'

const ROOT = process.cwd()
const POSTS_ROOT = path.join(ROOT, 'posts')
const PUBLIC_ROOT = path.join(ROOT, 'public')
const MAX_HEADER_BYTES = 512 * 1024
const CONCURRENCY = 20

async function walk(directory) {
	const entries = await fs.readdir(directory, { withFileTypes: true })
	const nested = await Promise.all(
		entries.map((entry) => {
			const absolute = path.join(directory, entry.name)
			return entry.isDirectory() ? walk(absolute) : [absolute]
		})
	)
	return nested.flat()
}

function collectSources(markdown) {
	const sources = new Set()
	const tree = unified().use(remarkParse).parse(markdown)
	const definitions = new Map()
	visit(tree, 'definition', (node) => definitions.set(node.identifier, node.url))
	visit(tree, 'image', (node) => sources.add(node.url))
	visit(tree, 'imageReference', (node) => {
		const source = definitions.get(node.identifier)
		if (source) sources.add(source)
	})
	visit(tree, 'html', (node) => {
		for (const match of node.value.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
			sources.add(match[1])
		}
	})
	return sources
}

function validDimensions(width, height) {
	return (
		Number.isInteger(width) &&
		Number.isInteger(height) &&
		width > 0 &&
		height > 0 &&
		width <= 100_000 &&
		height <= 100_000
	)
}

function readDimensions(buffer, contentType = '') {
	// PNG
	if (
		buffer.length >= 24 &&
		buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
	) {
		return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
	}

	// GIF
	if (
		buffer.length >= 10 &&
		(buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
			buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
	) {
		return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
	}

	// JPEG SOF marker
	if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
		let offset = 2
		while (offset + 8 < buffer.length) {
			if (buffer[offset] !== 0xff) {
				offset += 1
				continue
			}
			const marker = buffer[offset + 1]
			if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
				offset += 2
				continue
			}
			if (marker === 0xda) break
			const length = buffer.readUInt16BE(offset + 2)
			if (length < 2 || offset + length + 2 > buffer.length) break
			if (
				(marker >= 0xc0 && marker <= 0xc3) ||
				(marker >= 0xc5 && marker <= 0xc7) ||
				(marker >= 0xc9 && marker <= 0xcb) ||
				(marker >= 0xcd && marker <= 0xcf)
			) {
				return {
					width: buffer.readUInt16BE(offset + 7),
					height: buffer.readUInt16BE(offset + 5),
				}
			}
			offset += length + 2
		}
	}

	// WebP (VP8X, VP8L, and VP8 bitstreams)
	if (
		buffer.length >= 30 &&
		buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buffer.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		const chunk = buffer.subarray(12, 16).toString('ascii')
		if (chunk === 'VP8X' && buffer.length >= 30) {
			return {
				width: 1 + buffer.readUIntLE(24, 3),
				height: 1 + buffer.readUIntLE(27, 3),
			}
		}
		if (chunk === 'VP8L' && buffer.length >= 25) {
			const b1 = buffer[21]
			const b2 = buffer[22]
			const b3 = buffer[23]
			const b4 = buffer[24]
			return {
				width: 1 + (b1 | ((b2 & 0x3f) << 8)),
				height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
			}
		}
		if (
			chunk === 'VP8 ' &&
			buffer.length >= 30 &&
			buffer[23] === 0x9d &&
			buffer[24] === 0x01 &&
			buffer[25] === 0x2a
		) {
			return {
				width: buffer.readUInt16LE(26) & 0x3fff,
				height: buffer.readUInt16LE(28) & 0x3fff,
			}
		}
	}

	// AVIF/HEIF spatial extents are stored in an `ispe` full box.
	const ispe = buffer.indexOf(Buffer.from('ispe'))
	if (ispe >= 4 && ispe + 16 <= buffer.length) {
		return {
			width: buffer.readUInt32BE(ispe + 8),
			height: buffer.readUInt32BE(ispe + 12),
		}
	}

	// SVG dimensions or viewBox.
	if (contentType.includes('svg') || buffer.subarray(0, 512).toString('utf8').includes('<svg')) {
		const source = buffer.toString('utf8')
		const width = source.match(/\bwidth=["']([\d.]+)(?:px)?["']/i)?.[1]
		const height = source.match(/\bheight=["']([\d.]+)(?:px)?["']/i)?.[1]
		if (width && height) return { width: Math.round(Number(width)), height: Math.round(Number(height)) }
		const viewBox = source.match(/\bviewBox=["'][^"']*?([\d.]+)[ ,]+([\d.]+)["']/i)
		if (viewBox) return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])) }
	}

	return null
}

async function readResponsePrefix(response) {
	if (!response.body) return Buffer.alloc(0)
	const chunks = []
	let length = 0
	const reader = response.body.getReader()
	while (length < MAX_HEADER_BYTES) {
		const { done, value } = await reader.read()
		if (done) break
		const remaining = MAX_HEADER_BYTES - length
		const chunk = Buffer.from(value.subarray(0, remaining))
		chunks.push(chunk)
		length += chunk.length
		if (value.length > remaining) break
	}
	await reader.cancel().catch(() => {})
	return Buffer.concat(chunks)
}

async function loadSource(source) {
	if (source.startsWith('/')) {
		return {
			buffer: await fs.readFile(path.join(PUBLIC_ROOT, source.replace(/^\/+/, ''))),
			contentType: '',
		}
	}

	const url = source.startsWith('//') ? `https:${source}` : source
	if (!/^https?:\/\//i.test(url)) return null
	const response = await fetch(url, {
		headers: {
			Range: `bytes=0-${MAX_HEADER_BYTES - 1}`,
			'User-Agent': 'next-blog-image-metadata/1.0',
		},
		redirect: 'follow',
		signal: AbortSignal.timeout(15_000),
	})
	if (!response.ok && response.status !== 206) {
		throw new Error(`HTTP ${response.status}`)
	}
	return {
		buffer: await readResponsePrefix(response),
		contentType: response.headers.get('content-type') ?? '',
	}
}

async function main() {
	const jsonOnly = process.argv.includes('--json-only')
	const writeManifest = process.argv.includes('--write')
	const files = (await walk(POSTS_ROOT)).filter((file) => file.endsWith('.md'))
	const sourceSets = await Promise.all(
		files.map(async (file) => collectSources(await fs.readFile(file, 'utf8')))
	)
	const sources = [...new Set(sourceSets.flatMap((set) => [...set]))].sort()
	const dimensions = {}
	let nextIndex = 0
	const failures = []

	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, sources.length) }, async () => {
			while (nextIndex < sources.length) {
				const source = sources[nextIndex]
				nextIndex += 1
				try {
					const loaded = await loadSource(source)
					const size = loaded && readDimensions(loaded.buffer, loaded.contentType)
					if (!size || !validDimensions(size.width, size.height)) {
						throw new Error('unsupported or invalid image')
					}
					dimensions[source] = size
				} catch (error) {
					failures.push(`${source}: ${error instanceof Error ? error.message : 'unknown'}`)
				}
			}
		})
	)

	if (!jsonOnly) {
		for (const failure of failures.sort()) console.error(failure)
		console.error(`Resolved ${Object.keys(dimensions).length}/${sources.length} unique images`)
	}
	if (failures.length > 0) {
		throw new Error('Unable to resolve every post image; the existing manifest was left unchanged')
	}
	const sortedDimensions = Object.fromEntries(
		Object.keys(dimensions)
			.sort()
			.map((source) => [source, dimensions[source]])
	)
	const output = `${JSON.stringify(sortedDimensions, null, 2)}\n`
	if (writeManifest) {
		await fs.writeFile(path.join(ROOT, 'lib', 'post-image-dimensions.json'), output)
		console.error('Updated lib/post-image-dimensions.json')
	} else {
		process.stdout.write(output)
	}
}

await main()
