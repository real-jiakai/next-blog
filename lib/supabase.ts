import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type CommentRow = {
	id: number
	username: string
	email: string
	website: string | null
	content: string
	created_at: string
	url: string
	parent_comment_id: number | null
	email_verified_at: string | null
}

type CommentDatabase = {
	public: {
		Tables: {
			comments: {
				Row: CommentRow
				Insert: Omit<CommentRow, 'id' | 'created_at' | 'email_verified_at'> & {
					id?: number
					created_at?: string
					email_verified_at?: string | null
				}
				Update: Partial<CommentRow>
				Relationships: []
			}
		}
		Views: Record<never, never>
		Functions: Record<never, never>
	}
}

type CommentDatabaseClient = SupabaseClient<CommentDatabase>

let cachedClient: CommentDatabaseClient | undefined
let cachedConfiguration: string | undefined

/**
 * Apply supabase/migrations/202607100001_secure_comments.sql (see AGENTS.md and
 * CONTRIBUTING.md) before deploying these routes. It revokes every browser-role
 * (public/anon/authenticated) privilege on public.comments, its id sequence and
 * the legacy public.comment_emails view, enables RLS, and grants only
 * service_role.
 *
 * The server secret uses Supabase's `service_role`, which retains access and
 * bypasses RLS. After verifying no other code consumes it, the obsolete
 * `public.comment_emails` view can be dropped. Never grant browser roles INSERT,
 * UPDATE, email SELECT, or view access again: doing so bypasses this API's
 * Turnstile, origin, validation, verification, and rate-limit controls.
 */
export function getSupabaseServerClient(): CommentDatabaseClient {
	if (typeof window !== 'undefined') {
		throw new Error('The Supabase server client cannot run in a browser')
	}

	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
	const secret =
		process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !secret) {
		throw new Error(
			'Supabase server configuration is missing (SUPABASE_URL and SUPABASE_SECRET_KEY)'
		)
	}

	let parsedUrl: URL
	try {
		parsedUrl = new URL(url)
	} catch {
		throw new Error('Supabase server URL is invalid')
	}
	if (
		parsedUrl.username ||
		parsedUrl.password ||
		(parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') ||
		parsedUrl.search ||
		parsedUrl.hash
	) {
		throw new Error('Supabase server URL must contain only an HTTP(S) origin')
	}
	const localHttpHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
	if (
		parsedUrl.protocol !== 'https:' &&
		!(parsedUrl.protocol === 'http:' && localHttpHosts.has(parsedUrl.hostname))
	) {
		throw new Error(
			'Supabase server URL must use HTTPS (HTTP is allowed only for loopback development)'
		)
	}

	const configuration = `${url}\u0000${secret}`
	if (!cachedClient || cachedConfiguration !== configuration) {
		cachedClient = createClient<CommentDatabase>(url, secret, {
			auth: {
				autoRefreshToken: false,
				detectSessionInUrl: false,
				persistSession: false,
			},
		})
		cachedConfiguration = configuration
	}

	return cachedClient
}
