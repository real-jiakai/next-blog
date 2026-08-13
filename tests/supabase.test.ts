import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn(() => ({ from: vi.fn() })),
}))

import { createClient } from '@supabase/supabase-js'

describe('Supabase server client', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.mocked(createClient).mockClear()
		delete process.env.SUPABASE_URL
		delete process.env.SUPABASE_SECRET_KEY
		delete process.env.SUPABASE_SERVICE_ROLE_KEY
		delete process.env.NEXT_PUBLIC_SUPABASE_URL
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	})

	it('loads configuration lazily and fails closed without a server secret', async () => {
		const { getSupabaseServerClient } = await import('@/lib/supabase')
		expect(createClient).not.toHaveBeenCalled()
		expect(() => getSupabaseServerClient()).toThrow(/configuration is missing/)
		expect(createClient).not.toHaveBeenCalled()
	})

	it('uses only the server secret and disables session persistence', async () => {
		process.env.SUPABASE_URL = 'https://project.supabase.co'
		process.env.SUPABASE_SECRET_KEY = 'server-secret'
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key'
		const { getSupabaseServerClient } = await import('@/lib/supabase')

		getSupabaseServerClient()
		expect(createClient).toHaveBeenCalledWith(
			'https://project.supabase.co',
			'server-secret',
			expect.objectContaining({
				auth: {
					autoRefreshToken: false,
					detectSessionInUrl: false,
					persistSession: false,
				},
			})
		)
	})

	it('reuses a client while the server configuration is unchanged', async () => {
		process.env.SUPABASE_URL = 'https://project.supabase.co'
		process.env.SUPABASE_SECRET_KEY = 'server-secret'
		const { getSupabaseServerClient } = await import('@/lib/supabase')

		const first = getSupabaseServerClient()
		const second = getSupabaseServerClient()
		expect(second).toBe(first)
		expect(createClient).toHaveBeenCalledTimes(1)
	})

	it.each([
		'http://localhost:54321',
		'http://127.0.0.1:54321',
		'http://[::1]:54321',
	])('allows HTTP only for local Supabase development at %s', async (url) => {
		process.env.SUPABASE_URL = url
		process.env.SUPABASE_SECRET_KEY = 'server-secret'
		const { getSupabaseServerClient } = await import('@/lib/supabase')

		expect(() => getSupabaseServerClient()).not.toThrow()
		expect(createClient).toHaveBeenCalledWith(url, 'server-secret', expect.anything())
	})

	it.each([
		'http://project.supabase.co',
		'ftp://localhost/project',
		'javascript://localhost/project',
		'https://project.supabase.co@evil.example',
		'https://project.supabase.co/rest',
		'https://project.supabase.co?redirect=evil.example',
		'https://project.supabase.co#fragment',
	])('rejects an unsafe Supabase URL: %s', async (url) => {
		process.env.SUPABASE_URL = url
		process.env.SUPABASE_SECRET_KEY = 'server-secret'
		const { getSupabaseServerClient } = await import('@/lib/supabase')

		expect(() => getSupabaseServerClient()).toThrow(/HTTP\(S\) origin|HTTPS/)
		expect(createClient).not.toHaveBeenCalled()
	})
})
