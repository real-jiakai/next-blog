import { NextRequest, NextResponse, after } from 'next/server'
import validator from 'email-validator'
import supabase from '@/lib/supabase'
import nodemailer from 'nodemailer'
import { commentToPlainText, escapeHtml } from '@/lib/renderComment'

// Server-side field limits. The client validates too, but the API must not
// trust it — direct calls bypass the form entirely.
const LIMITS = {
	username: 64,
	email: 254,
	website: 200,
	content: 5000,
} as const

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

async function getEmailsFromParentComments(commentId: number) {
	const { data, error } = await supabase
		.from('comment_emails')
		.select('emails')
		.eq('id', commentId)
		.single()

	if (error) {
		console.error('Error fetching parent comment emails:', error)
		return []
	}

	return data.emails
}

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST,
	port: parseInt(process.env.EMAIL_PORT || '587'),
	secure: process.env.EMAIL_SECURE === 'true',
	// On STARTTLS ports (587/2525) refuse to send credentials unencrypted
	requireTLS: process.env.EMAIL_SECURE !== 'true',
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD,
	},
	// Fail fast if SMTP is unreachable; nodemailer's 2-minute defaults
	// otherwise leave sockets dangling long after the response is sent
	connectionTimeout: 10_000,
	greetingTimeout: 10_000,
	socketTimeout: 20_000,
})

export async function POST(request: NextRequest) {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
	}

	const { username, email, website, content, token, parent_comment_id } =
    (body ?? {}) as Record<string, unknown>

	// Derive the page URL from the Referer. An empty or malformed header must
	// not throw an unhandled error (which would 500 with a stack trace).
	const referer = request.headers.get('referer') || ''
	let cleanUrl: string
	try {
		const refererUrl = new URL(referer)
		cleanUrl = `${refererUrl.origin}${refererUrl.pathname}`
	} catch {
		return NextResponse.json({ error: 'Invalid referer' }, { status: 400 })
	}

	// Validate every field before touching the database or SMTP.
	if (!isNonEmptyString(username) || username.length > LIMITS.username) {
		return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
	}
	if (
		typeof email !== 'string' ||
    email.length > LIMITS.email ||
    !validator.validate(email)
	) {
		return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
	}
	if (!isNonEmptyString(content) || content.length > LIMITS.content) {
		return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
	}
	if (
		website != null &&
    (typeof website !== 'string' || website.length > LIMITS.website)
	) {
		return NextResponse.json({ error: 'Invalid website' }, { status: 400 })
	}
	if (
		parent_comment_id != null &&
    !Number.isInteger(parent_comment_id)
	) {
		return NextResponse.json(
			{ error: 'Invalid parent comment id' },
			{ status: 400 }
		)
	}
	if (typeof token !== 'string' || token.length === 0) {
		return NextResponse.json({ error: 'Missing token' }, { status: 403 })
	}

	// Verify Cloudflare Turnstile token
	const verifyEndpoint =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify'
	const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

	const result = await fetch(verifyEndpoint, {
		method: 'POST',
		body: `secret=${encodeURIComponent(secret || '')}&response=${encodeURIComponent(token)}`,
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
		},
	})

	const data = await result.json()
	if (!data.success) {
		return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
	}

	// Normalize validated values (email/username/content are strings by now).
	const safeUsername = username.trim()
	const safeContent = content
	const safeWebsite = typeof website === 'string' ? website.trim() : ''
	const safeParentId =
    typeof parent_comment_id === 'number' ? parent_comment_id : null

	const { data: insertedData, error } = await supabase
		.from('comments')
		.insert([
			{
				username: safeUsername,
				email,
				website: safeWebsite,
				content: safeContent,
				url: cleanUrl,
				parent_comment_id: safeParentId,
			},
		])
		.select()

	if (error) {
		console.error('Error inserting comment:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}

	// Send notification emails after the response is delivered — a slow or
	// unreachable SMTP server must never delay or fail the comment submission
	after(async () => {
		const commentId = insertedData?.[0]?.id
		if (!commentId) return

		const plainText = await commentToPlainText(safeContent)
		const safeHtml = escapeHtml(plainText)

		const parentCommentEmails = await getEmailsFromParentComments(commentId)

		for (const parentCommentEmail of parentCommentEmails || []) {
			try {
				const info = await transporter.sendMail({
					from: process.env.EMAIL_USERNAME,
					to: parentCommentEmail,
					subject: `New reply to your comment in ${process.env.NEXT_PUBLIC_SITE_TITLE}`,
					text: `${safeUsername} replied to your comment: ${plainText}. Please visit ${cleanUrl} to view it.`,
					html: `<p>${escapeHtml(safeUsername)} replied to your comment: ${safeHtml}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
				})
				console.log(`Reply notification sent for comment ${commentId}: ${info.response}`)
			} catch (err) {
				console.error('Error sending email:', err)
			}
		}

		// Send email to master
		const masterEmail = process.env.MASTER_EMAIL
		try {
			const info = await transporter.sendMail({
				from: process.env.EMAIL_USERNAME,
				to: masterEmail,
				subject: `New comment on ${process.env.NEXT_PUBLIC_SITE_TITLE}`,
				text: `${safeUsername} commented: ${plainText}. Please visit ${cleanUrl} to view it.`,
				html: `<p>${escapeHtml(safeUsername)} commented: ${safeHtml}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
			})
			console.log(`Master notification sent for comment ${commentId}: ${info.response}`)
		} catch (err) {
			console.error('Error sending email to master:', err)
		}
	})

	return NextResponse.json(insertedData)
}
