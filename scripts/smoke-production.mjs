import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { getSortedPostsData, selectFeedPosts } from './generate-rss.mjs'

const hostname = '127.0.0.1'
const port = 3017
const origin = `http://${hostname}:${port}`
const standaloneDirectory = path.join(process.cwd(), '.next', 'standalone')
const feeds = [
	['/index.xml', 'zh'],
	['/en/index.xml', 'en'],
]
const logs = []
const checkedPaths = new Set()

function capture(chunk) {
	logs.push(String(chunk))
	if (logs.length > 100) logs.shift()
}

function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function request(pathname, headers = {}) {
	return fetch(`${origin}${pathname}`, {
		headers,
		redirect: 'manual',
		signal: AbortSignal.timeout(5_000),
	})
}

// What the client router sends when it navigates to a page: the RSC header
// and, in `next-url`, the page it is navigating from.
function requestRsc(pathname) {
	return request(pathname, { rsc: '1', 'next-url': '/zh/archive' })
}

function hasExited(child) {
	return child.exitCode !== null || child.signalCode !== null
}

function assertRunning(server) {
	if (hasExited(server)) {
		throw new Error(
			`Production server exited (code ${server.exitCode}, signal ${server.signalCode})`,
		)
	}
}

// Anything already answering on the port would pass every check below in
// place of the server under test.
async function assertPortFree() {
	try {
		await request('/robots.txt')
	} catch {
		return
	}
	throw new Error(`Port ${port} is already in use; stop the other server first`)
}

async function waitUntilReady(server) {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		assertRunning(server)
		try {
			const response = await request('/robots.txt')
			if (response.status === 200) return
		} catch {
			// The listener is not ready yet.
		}
		await wait(250)
	}
	throw new Error('Production server did not become ready within 20 seconds')
}

function expectStatus(pathname, response, expected) {
	checkedPaths.add(pathname)
	if (response.status !== expected) {
		throw new Error(`${pathname}: expected ${expected}, received ${response.status}`)
	}
}

function expectLocation(pathname, response, expected) {
	const actual = response.headers.get('location')
	if (actual !== expected) {
		throw new Error(`${pathname}: expected Location ${expected}, received ${actual}`)
	}
}

// A second CDATA terminator, or a control character XML forbids, makes the
// whole feed unreadable while every <entry> can still be counted.
function expectWellFormedFeed(pathname, feed) {
	const outsideCdata = feed.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
	if (outsideCdata.includes('<![CDATA[') || outsideCdata.includes(']]>')) {
		throw new Error(`${pathname}: a CDATA section is not closed exactly once`)
	}
	if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(feed)) {
		throw new Error(`${pathname}: contains a character XML does not allow`)
	}
}

async function stop(server) {
	if (hasExited(server)) return
	server.kill('SIGTERM')
	await Promise.race([
		new Promise((resolve) => server.once('exit', resolve)),
		wait(3_000).then(() => server.kill('SIGKILL')),
	])
}

try {
	await stat(path.join(standaloneDirectory, 'server.js'))
} catch {
	throw new Error('Standalone build not found; run pnpm build before pnpm test:smoke')
}
await assertPortFree()

const server = spawn(
	process.execPath,
	['server.js'],
	{
		cwd: standaloneDirectory,
		env: {
			...process.env,
			COMMENT_API_ENABLED: 'false',
			HOSTNAME: hostname,
			PORT: String(port),
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	},
)
server.stdout.on('data', capture)
server.stderr.on('data', capture)
server.once('error', (error) => capture(`spawn error: ${error.message}\n`))

try {
	await waitUntilReady(server)

	for (const pathname of ['/', '/en', '/2024/07/weekly-issue-20']) {
		const response = await request(pathname)
		expectStatus(pathname, response, 200)
		if (!response.headers.has('content-security-policy')) {
			throw new Error(`${pathname}: security headers are missing`)
		}
		if (response.headers.has('x-powered-by')) {
			throw new Error(`${pathname}: X-Powered-By should not be sent`)
		}
	}

	const homeHtml = await (await request('/')).text()
	const staticAssetPath = homeHtml.match(
		/(?:href|src)="([^"?]*\/_next\/static\/[^"?]+)(?:\?[^" ]*)?"/
	)?.[1]
	if (!staticAssetPath) {
		throw new Error('Homepage did not reference a Next.js static asset')
	}
	expectStatus(staticAssetPath, await request(staticAssetPath), 200)

	const post = await request('/2024/07/weekly-issue-20')
	if (!(await post.text()).includes('<figure>')) {
		throw new Error('Rendered post is missing preserved accessible video markup')
	}

	// Mobile browsers autoplay only a muted, inline clip, so both attributes
	// must survive to the server HTML, and the clip must ship in the output.
	const clipPost = '/2023/01/weekly-issue-14'
	const clipResponse = await request(clipPost)
	expectStatus(clipPost, clipResponse, 200)
	const clipTag = (await clipResponse.text()).match(/<video\b[^>]*\bautoplay\b[^>]*>/i)?.[0]
	if (!clipTag || !/\bmuted\b/i.test(clipTag) || !/\bplaysinline\b/i.test(clipTag)) {
		throw new Error(`${clipPost}: the GIF-like clip is missing autoplay, muted, or playsinline`)
	}
	const clip = '/video/2023-01-26-curry-throws-his-mouthpiece.mp4'
	const clipAsset = await request(clip)
	expectStatus(clip, clipAsset, 200)
	if (clipAsset.headers.get('content-type') !== 'video/mp4') {
		throw new Error(`${clip}: expected Content-Type video/mp4`)
	}
	await clipAsset.body?.cancel()

	for (const [pathname, location] of [
		['/page/1', '/'],
		['/en/page/1', '/en'],
		['/zh/about?probe=1', '/about?probe=1'],
	]) {
		const response = await request(pathname)
		expectStatus(pathname, response, 308)
		expectLocation(pathname, response, location)
	}

	for (const pathname of [
		'/page/999',
		'/tag/weekly',
		'/2025/01/using-next.js',
		'/foo',
		'/fr',
		'/fr/about',
	]) {
		expectStatus(pathname, await request(pathname), 404)
	}

	for (const pathname of ['/en/definitely-missing', '/en/missing.png']) {
		const englishNotFound = await request(pathname)
		expectStatus(pathname, englishNotFound, 404)
		if (!englishNotFound.headers.has('content-security-policy')) {
			throw new Error(`${pathname}: security headers are missing from the 404`)
		}
		const englishNotFoundHtml = await englishNotFound.text()
		if (
			!englishNotFoundHtml.includes('<html lang="en"') ||
			!englishNotFoundHtml.includes('<title>Page Not Found')
		) {
			throw new Error(`${pathname}: English 404 is not localized on the server`)
		}
	}

	// The client router fetches pages as RSC payloads. For a page that does not
	// exist the proxy answers a plain, uncacheable 404 (the router then loads
	// the URL as a document); Next's own fallback would answer 500.
	for (const pathname of [
		'/2026/01/not-a-post',
		'/page/999',
		'/en/page/999',
		'/en/2026/01/nope',
		'/fr',
	]) {
		const response = await requestRsc(pathname)
		expectStatus(`${pathname} (rsc)`, response, 404)
		if (response.headers.get('content-type')?.startsWith('text/x-component')) {
			throw new Error(`${pathname}: an RSC 404 would leave the router on a blank page`)
		}
		if (response.headers.get('cache-control') !== 'private, no-cache, no-store, max-age=0, must-revalidate') {
			throw new Error(`${pathname}: the RSC 404 must not be cacheable`)
		}
	}

	// A page that does exist still gets its payload, so navigation stays
	// client-side. This also proves the standalone output carries posts/,
	// which the proxy reads to tell the two apart. Without the cache-busting
	// `_rsc` query the server first redirects to the URL that carries it.
	for (const pathname of ['/en/archive', '/2024/07/weekly-issue-20']) {
		let response = await requestRsc(pathname)
		if (response.status === 307) {
			response = await requestRsc(response.headers.get('location'))
		}
		expectStatus(`${pathname} (rsc)`, response, 200)
		if (!response.headers.get('content-type')?.startsWith('text/x-component')) {
			throw new Error(`${pathname}: expected an RSC payload`)
		}
	}

	for (const [pathname, locale] of feeds) {
		const response = await request(pathname)
		expectStatus(pathname, response, 200)
		const feed = await response.text()
		expectWellFormedFeed(pathname, feed)
		// The feed carries the newest posts, not the whole archive, so this has
		// to apply the same cap the generator does rather than counting every
		// post on disk.
		const expectedEntries = selectFeedPosts(
			getSortedPostsData(locale, path.join(process.cwd(), 'posts')),
		).length
		if ((feed.match(/<entry>/g) || []).length !== expectedEntries) {
			throw new Error(`${pathname}: expected ${expectedEntries} Atom entries`)
		}
	}

	expectStatus('/api/comSelect', await request('/api/comSelect'), 404)
	// The RSC requests above used to end in this invariant and a 500.
	if (logs.join('').includes('InvariantError')) {
		throw new Error('The server logged an invariant violation while serving the checks')
	}
	// A server that died after readiness means something else answered.
	assertRunning(server)
	console.log(
		`Production standalone smoke checks passed (${checkedPaths.size - feeds.length} HTTP routes/assets, ${feeds.length} feeds)`,
	)
} catch (error) {
	console.error(logs.join(''))
	throw error
} finally {
	await stop(server)
}
