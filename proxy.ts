import { NextRequest, NextResponse } from 'next/server'
import { isStaticPagePath } from '@/lib/static-paths'

const LOCALE_HEADER = 'x-blog-locale'
const LOCALES = new Set(['zh', 'en'])
// The same value the server sends with its own 404s, so a CDN keeps none.
const NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate'

/**
 * Preserve the requested locale for the routing-level global 404 document.
 * Redirects and locale rewrites stay in next.config.mjs; this proxy only adds a
 * trusted internal request header and therefore cannot create rewrite loops.
 *
 * The one exception is a percent-encoded locale segment (`/%7Ah/about`). The
 * config redirects match the raw path and miss it, while the router decodes
 * the segment, so it would serve every page again under a second URL. It is
 * sent to the canonical form instead, which no longer carries an escape.
 *
 * The client router fetches a page as an RSC payload. Every page under `[lang]`
 * is prerendered and the layout sets `dynamicParams = false`, so for a URL
 * nothing was generated for, Next strips the RSC headers, gives up on the
 * route and re-dispatches to the global 404, which then renders as HTML for a
 * request still marked as RSC: a 500 and an "Expected RSC response" invariant
 * in the log. Such fetches are answered here with a plain 404, which makes the
 * router load the URL as a document instead, and that request gets the usual
 * server-rendered, localized 404 page. Next hides the `rsc` header from the
 * proxy, so the router is recognized by `next-url`, the header in which it
 * names the page it is on and which nothing else sends; a page's own fetch()
 * of a file keeps working.
 */
export function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname
	const [, rawSegment = '', rest = ''] = /^\/([^/]*)(.*)$/.exec(pathname) ?? []
	let segment = rawSegment
	try {
		segment = decodeURIComponent(rawSegment)
	} catch {
		// A malformed escape cannot name a locale; leave it to the router.
	}

	if (segment !== rawSegment && LOCALES.has(segment)) {
		const url = request.nextUrl.clone()
		url.pathname = segment === 'zh' ? rest || '/' : `/en${rest}`
		return NextResponse.redirect(url, 308)
	}

	if (request.headers.has('next-url') && !isStaticPagePath(pathname)) {
		return new NextResponse(null, {
			status: 404,
			headers: { 'cache-control': NO_STORE },
		})
	}

	const requestHeaders = new Headers(request.headers)
	requestHeaders.set(LOCALE_HEADER, segment === 'en' ? 'en' : 'zh')

	return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
