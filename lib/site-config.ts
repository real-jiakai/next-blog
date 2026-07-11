const DEFAULT_POSTS_PER_PAGE = 10
const MAX_POSTS_PER_PAGE = 100

export function getPostsPerPage(
	value: string | undefined = process.env.NEXT_PUBLIC_POSTS_PERPAGE,
): number {
	if (value === undefined || value.trim() === '') {
		return DEFAULT_POSTS_PER_PAGE
	}

	if (!/^[1-9]\d*$/.test(value)) {
		throw new Error('NEXT_PUBLIC_POSTS_PERPAGE must be a positive integer')
	}

	const postsPerPage = Number(value)
	if (!Number.isSafeInteger(postsPerPage) || postsPerPage > MAX_POSTS_PER_PAGE) {
		throw new Error(
			`NEXT_PUBLIC_POSTS_PERPAGE must be between 1 and ${MAX_POSTS_PER_PAGE}`,
		)
	}

	return postsPerPage
}

export function parsePageNumber(value: string): number | null {
	if (!/^[1-9]\d*$/.test(value)) {
		return null
	}

	const page = Number(value)
	return Number.isSafeInteger(page) ? page : null
}
