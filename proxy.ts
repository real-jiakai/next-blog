import { NextRequest, NextResponse } from 'next/server'

const LOCALE_HEADER = 'x-blog-locale'

/**
 * Preserve the requested locale for the routing-level global 404 document.
 * Redirects and locale rewrites stay in next.config.mjs; this proxy only adds a
 * trusted internal request header and therefore cannot create rewrite loops.
 */
export function proxy(request: NextRequest) {
	const requestHeaders = new Headers(request.headers)
	const pathname = request.nextUrl.pathname
	requestHeaders.set(
		LOCALE_HEADER,
		pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh'
	)

	return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
