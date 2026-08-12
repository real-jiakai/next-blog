import { spawn } from 'node:child_process'
import path from 'node:path'
import { getSortedPostsData, selectFeedPosts } from './generate-rss.mjs'

const hostname = '127.0.0.1'
const port = 3017
const origin = `http://${hostname}:${port}`
const logs = []

function capture(chunk) {
	logs.push(String(chunk))
	if (logs.length > 100) logs.shift()
}

function wait(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function request(pathname) {
	return fetch(`${origin}${pathname}`, {
		redirect: 'manual',
		signal: AbortSignal.timeout(5_000),
	})
}

async function waitUntilReady(server) {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		if (server.exitCode !== null) {
			throw new Error(`Production server exited with code ${server.exitCode}`)
		}
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

async function stop(server) {
	if (server.exitCode !== null) return
	server.kill('SIGTERM')
	await Promise.race([
		new Promise((resolve) => server.once('exit', resolve)),
		wait(3_000).then(() => server.kill('SIGKILL')),
	])
}

const server = spawn(
	process.execPath,
	['server.js'],
	{
		cwd: path.join(process.cwd(), '.next', 'standalone'),
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

try {
	await waitUntilReady(server)

	for (const pathname of ['/', '/en', '/2024/07/weekly-issue-20']) {
		const response = await request(pathname)
		expectStatus(pathname, response, 200)
		if (!response.headers.has('content-security-policy')) {
			throw new Error(`${pathname}: security headers are missing`)
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

	for (const [pathname, locale] of [
		['/index.xml', 'zh'],
		['/en/index.xml', 'en'],
	]) {
		const response = await request(pathname)
		expectStatus(pathname, response, 200)
		const feed = await response.text()
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
	console.log('Production standalone smoke checks passed (15 HTTP routes/assets, 2 feeds)')
} catch (error) {
	console.error(logs.join(''))
	throw error
} finally {
	await stop(server)
}
