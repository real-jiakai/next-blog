import { NextRequest, NextResponse } from 'next/server'

const i18n = {
	defaultLocale: 'zh',
	locales: ['zh', 'en'],
} as const

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Skip API routes, static files, and RSS
	if (
		pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/index.xml'
	) {
		return
	}

	// If URL starts with /zh/, redirect to URL without prefix (zh is default, no prefix needed)
	if (pathname.startsWith('/zh/') || pathname === '/zh') {
		const newPath = pathname.replace(/^\/zh/, '') || '/'
		return NextResponse.redirect(new URL(newPath, request.url))
	}

	// If URL starts with /en/, let it pass through to App Router
	if (pathname.startsWith('/en/') || pathname === '/en') {
		return
	}

	// For all other URLs (no locale prefix), internally rewrite to /zh/... for App Router
	// This is invisible to the user - URL stays the same
	const url = request.nextUrl.clone()
	url.pathname = `/zh${pathname}`
	return NextResponse.rewrite(url)
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
