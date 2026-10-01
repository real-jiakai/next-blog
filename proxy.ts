import { NextRequest, NextResponse } from 'next/server'

const LOCALE_HEADER = 'x-blog-locale'
const LOCALES = new Set(['zh', 'en'])

/**
 * Preserve the requested locale for the routing-level global 404 document.
 * Redirects and locale rewrites stay in next.config.mjs; this proxy only adds a
 * trusted internal request header and therefore cannot create rewrite loops.
 *
 * The one exception is a percent-encoded locale segment (`/%7Ah/about`). The
 * config redirects match the raw path and miss it, while the router decodes
 * the segment, so it would serve every page again under a second URL. It is
 * sent to the canonical form instead, which no longer carries an escape.
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

	const requestHeaders = new Headers(request.headers)
	requestHeaders.set(LOCALE_HEADER, segment === 'en' ? 'en' : 'zh')

	return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
