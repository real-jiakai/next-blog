// Lists the cover images the contents page can show, so next.config.mjs can
// let the image optimizer fetch exactly those URLs and nothing else on the two
// public image hosts. Run after `images:metadata` (a cover counts only once its
// size is in the manifest); `pnpm images:metadata` runs both.
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { extractCoverImage } from '../lib/issues.ts'

const root = process.cwd()
const manifest = JSON.parse(
	await fs.readFile(path.join(root, 'lib', 'post-image-dimensions.json'), 'utf8'),
)

const covers = new Set()
for (const locale of ['zh', 'en']) {
	const directory = path.join(root, 'posts', locale)
	for (const name of (await fs.readdir(directory)).filter((file) => file.endsWith('.md'))) {
		const { data, content } = matter(await fs.readFile(path.join(directory, name), 'utf8'))
		if (data.draft === true) continue
		const cover = extractCoverImage(content, manifest, String(data.title ?? ''))
		if (cover) covers.add(cover.src)
	}
}

const output = path.join(root, 'lib', 'cover-urls.json')
await fs.writeFile(output, `${JSON.stringify([...covers].sort(), null, '\t')}\n`)
console.log(`Wrote ${covers.size} cover URLs to ${path.relative(root, output)}`)
