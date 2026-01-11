import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import nodemailer from 'nodemailer'

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
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD,
	},
})

export async function POST(request: NextRequest) {
	const { username, email, website, content, token, parent_comment_id } =
    await request.json()
	const processedContent = content.replace(
		/(^<blockquote>[\s\S]*<\/blockquote>\s*)|(\s*<br\s*\/>\s*)/g,
		''
	)

	const referer = request.headers.get('referer') || ''
	const refererUrl = new URL(referer)
	const cleanUrl = `${refererUrl.origin}${refererUrl.pathname}`

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

	const { data: insertedData, error } = await supabase
		.from('comments')
		.insert([
			{
				username,
				email,
				website,
				content,
				url: cleanUrl,
				parent_comment_id: parent_comment_id || null,
			},
		])
		.select()

	if (error) {
		console.error('Error inserting comment:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}

	// Get parent comment emails and send notifications
	const parentCommentEmails = await getEmailsFromParentComments(
		insertedData[0].id
	)

	for (const parentCommentEmail of parentCommentEmails) {
		try {
			await transporter.sendMail({
				from: process.env.EMAIL_USERNAME,
				to: parentCommentEmail,
				subject: `New reply to your comment in ${process.env.NEXT_PUBLIC_SITE_TITLE}`,
				text: `${username} replied to your comment: ${processedContent}. Please visit ${cleanUrl} to view it.`,
				html: `<p>${username} replied to your comment: ${processedContent}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
			})
		} catch (err) {
			console.error('Error sending email:', err)
		}
	}

	// Send email to master
	const masterEmail = process.env.MASTER_EMAIL
	try {
		await transporter.sendMail({
			from: process.env.EMAIL_USERNAME,
			to: masterEmail,
			subject: `New comment on ${process.env.NEXT_PUBLIC_SITE_TITLE}`,
			text: `${username} commented: ${processedContent}. Please visit ${cleanUrl} to view it.`,
			html: `<p>${username} commented: ${processedContent}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
		})
	} catch (err) {
		console.error('Error sending email to master:', err)
	}

	return NextResponse.json(insertedData)
}
