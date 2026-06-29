# Comment Markdown + Safe HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render blog comments as GitHub-flavored Markdown plus a safe subset of inline HTML, neutralizing XSS, while keeping the Quote feature and notification emails working.

**Architecture:** Add a single server-side module (`lib/renderComment.ts`) that converts Markdown+HTML to sanitized HTML using the existing `unified` (remark/rehype) stack plus `rehype-sanitize`. `comSelect` renders+sanitizes on read (this also retroactively neutralizes already-stored malicious comments); `comInsert` uses a plaintext variant for emails. The DB continues to store the raw Markdown source.

**Tech Stack:** Next.js 16 (App Router), TypeScript, unified/remark/rehype, rehype-sanitize, Tailwind 4, vitest.

**Spec:** `docs/superpowers/specs/2026-06-29-comment-markdown-html-design.md`

---

## Before you start

We are on the `main` branch. Create a feature branch first:

```bash
git checkout -b feat/comment-markdown
```

All commits in this plan go on that branch.

## File map

| File | Action | Responsibility |
| --- | --- | --- |
| `lib/renderComment.ts` | Create | Convert Markdown+HTML → sanitized HTML; plaintext + HTML-escape helpers for emails |
| `lib/renderComment.test.ts` | Create | Unit tests: XSS neutralization, Markdown preservation, helpers |
| `vitest.config.ts` | Create | Scope vitest to `lib/**/*.test.ts`, node environment |
| `package.json` | Modify | Add `rehype-sanitize`, `vitest`; add `test` script |
| `app/api/comSelect/route.ts` | Modify | Render+sanitize each comment's content on read |
| `app/api/comInsert/route.ts` | Modify | Use plaintext/escaped content for notification emails |
| `components/CommentList/index.tsx` | Modify | Render sanitized HTML in a `<div class="comment-content">` |
| `components/CommentForm/index.tsx` | Modify | Add localized "Markdown supported" hint; extend `CommentDict` |
| `components/Comment/index.tsx` | Modify | Extend `CommentDict` interface with the new key |
| `app/globals.css` | Modify | Add `.comment-content` prose styling |
| `lib/dictionaries/en.json` | Modify | Add `MarkdownTip` key |
| `lib/dictionaries/zh.json` | Modify | Add `MarkdownTip` key |

---

## Task 1: Add dependencies and test scaffolding

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
pnpm add rehype-sanitize
pnpm add -D vitest
```

Expected: both packages added; `rehype-sanitize` under `dependencies`, `vitest` under `devDependencies`.

- [ ] **Step 2: Add the `test` script to `package.json`**

In the `"scripts"` block, add a `test` entry (keep existing scripts):

```json
"test": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['lib/**/*.test.ts'],
		environment: 'node',
	},
})
```

- [ ] **Step 4: Verify the test runner starts (no tests yet)**

Run: `pnpm test`
Expected: vitest runs and reports "No test files found, exiting with code 0" (or similar). It must not error on config.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore(comment): add rehype-sanitize and vitest test runner"
```

---

## Task 2: Implement `lib/renderComment.ts` (TDD)

This is the security-critical unit. Write the tests first.

**Files:**
- Create: `lib/renderComment.test.ts`
- Create: `lib/renderComment.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/renderComment.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderCommentHtml, commentToPlainText, escapeHtml } from './renderComment'

describe('renderCommentHtml — XSS neutralization', () => {
	it('removes <script> elements', async () => {
		const html = await renderCommentHtml('<script>alert(1)</script>')
		expect(html).not.toContain('<script')
	})

	it('removes onerror and other event handlers from <img>', async () => {
		const html = await renderCommentHtml('<img src="x" onerror="alert(1)">')
		expect(html).not.toContain('onerror')
	})

	it('strips javascript: URLs from raw HTML links', async () => {
		const html = await renderCommentHtml('<a href="javascript:alert(1)">x</a>')
		expect(html).not.toContain('javascript:')
	})

	it('strips javascript: URLs from Markdown links', async () => {
		const html = await renderCommentHtml('[x](javascript:alert(1))')
		expect(html).not.toContain('javascript:')
	})

	it('removes <iframe> elements', async () => {
		const html = await renderCommentHtml('<iframe src="https://evil.example"></iframe>')
		expect(html).not.toContain('<iframe')
	})

	it('removes inline event handlers from block elements', async () => {
		const html = await renderCommentHtml('<div onclick="alert(1)">x</div>')
		expect(html).not.toContain('onclick')
	})

	it('removes inline style attributes', async () => {
		const html = await renderCommentHtml('<p style="position:fixed">x</p>')
		expect(html).not.toContain('style=')
	})
})

describe('renderCommentHtml — Markdown preservation', () => {
	it('renders headings', async () => {
		const html = await renderCommentHtml('# Hello')
		expect(html).toContain('<h1>Hello</h1>')
	})

	it('renders bold text', async () => {
		const html = await renderCommentHtml('**bold**')
		expect(html).toContain('<strong>bold</strong>')
	})

	it('renders unordered lists', async () => {
		const html = await renderCommentHtml('- a\n- b')
		expect(html).toContain('<ul>')
		expect(html).toContain('<li>a</li>')
	})

	it('renders GFM tables', async () => {
		const html = await renderCommentHtml('| h |\n| - |\n| c |')
		expect(html).toContain('<table>')
	})

	it('renders fenced code blocks', async () => {
		const html = await renderCommentHtml('```\ncode\n```')
		expect(html).toContain('<pre>')
		expect(html).toContain('<code>')
	})

	it('renders inline code', async () => {
		const html = await renderCommentHtml('use `x` here')
		expect(html).toContain('<code>x</code>')
	})
})

describe('renderCommentHtml — link hardening', () => {
	it('adds rel and target to links', async () => {
		const html = await renderCommentHtml('[site](https://example.com)')
		expect(html).toContain('href="https://example.com"')
		expect(html).toContain('target="_blank"')
		expect(html).toContain('rel="nofollow noopener noreferrer"')
	})
})

describe('renderCommentHtml — Quote feature compatibility', () => {
	it('preserves the blockquote/pre/p structure produced by the Quote feature', async () => {
		const quote = '<blockquote><pre>Quoting Bob:</pre><p>original</p></blockquote>\n\nmy reply'
		const html = await renderCommentHtml(quote)
		expect(html).toContain('<blockquote>')
		expect(html).toContain('<pre>')
		expect(html).toContain('original')
	})
})

describe('escapeHtml', () => {
	it('escapes HTML metacharacters', () => {
		expect(escapeHtml(`<b>&"'`)).toBe('&lt;b&gt;&amp;&quot;&#39;')
	})
})

describe('commentToPlainText', () => {
	it('strips tags and keeps readable text', async () => {
		const text = await commentToPlainText('# Hi\n\n**bold** <script>alert(1)</script>')
		expect(text).toContain('Hi')
		expect(text).toContain('bold')
		expect(text).not.toContain('<')
		expect(text).not.toContain('>')
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./renderComment` (module does not exist yet).

- [ ] **Step 3: Implement `lib/renderComment.ts`**

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

// Allow target/rel on <a> so the hardened link attributes survive sanitization.
// The default schema permits href but not target.
const schema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
	},
}

// Force safe link attributes on every anchor. Runs BEFORE rehype-sanitize so the
// sanitizer validates the final attribute values. (rehype-sanitize only strips —
// it cannot add attributes — hence this dedicated plugin.)
function hardenLinks() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'a') {
				node.properties = {
					...node.properties,
					target: '_blank',
					rel: 'nofollow noopener noreferrer',
				}
			}
		})
	}
}

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(hardenLinks)
	.use(rehypeSanitize, schema)
	.use(rehypeStringify)

export async function renderCommentHtml(markdown: string): Promise<string> {
	const file = await processor.process(markdown || '')
	return String(file)
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

export function escapeHtml(input: string): string {
	return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

// Plain-text rendering for notification emails. Strips tags from the sanitized
// HTML, then decodes the handful of entities Markdown introduces. Decode &amp;
// LAST so already-decoded sequences are not re-decoded.
export async function commentToPlainText(markdown: string): Promise<string> {
	const html = await renderCommentHtml(markdown)
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim()
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/renderComment.ts lib/renderComment.test.ts
git commit -m "feat(comment): add markdown+HTML sanitizing renderer"
```

---

## Task 3: Render+sanitize comments on read in `comSelect`

**Files:**
- Modify: `app/api/comSelect/route.ts`

No automated test here (an integration test would hit the production-shared Supabase DB, which is prohibited without authorization). The rendering logic is already covered by Task 2's unit tests; this task is one-line wiring verified manually.

- [ ] **Step 1: Import the renderer**

At the top of `app/api/comSelect/route.ts`, add:

```ts
import { renderCommentHtml } from '@/lib/renderComment'
```

- [ ] **Step 2: Render each comment before returning**

Replace the body of the `GET` handler's `try` block:

```ts
	try {
		const referer = request.headers.get('referer') || ''
		const comments = await fetchCommentsFromDB(referer)
		const rendered = await Promise.all(
			(comments || []).map(async (comment) => ({
				...comment,
				content: await renderCommentHtml(comment.content || ''),
			}))
		)
		return NextResponse.json(rendered)
	} catch (error: unknown) {
```

(Leave the `catch` block unchanged.)

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/comSelect/route.ts
git commit -m "feat(comment): sanitize and render comment markdown on read"
```

---

## Task 4: Use plaintext content for notification emails in `comInsert`

**Files:**
- Modify: `app/api/comInsert/route.ts`

- [ ] **Step 1: Import the email helpers**

At the top of `app/api/comInsert/route.ts`, add:

```ts
import { commentToPlainText, escapeHtml } from '@/lib/renderComment'
```

- [ ] **Step 2: Remove the old regex-based `processedContent`**

Delete these lines near the start of the `POST` handler:

```ts
	const processedContent = content.replace(
		/(^<blockquote>[\s\S]*<\/blockquote>\s*)|(\s*<br\s*\/>\s*)/g,
		''
	)
```

- [ ] **Step 3: Compute safe email text inside the `after()` callback**

Inside `after(async () => { ... })`, immediately after the `if (!commentId) return` line, add:

```ts
		const plainText = await commentToPlainText(content)
		const safeHtml = escapeHtml(plainText)
```

- [ ] **Step 4: Update the email bodies to use the new variables**

In the reply notification `sendMail` call, change:

```ts
				text: `${username} replied to your comment: ${plainText}. Please visit ${cleanUrl} to view it.`,
				html: `<p>${escapeHtml(username)} replied to your comment: ${safeHtml}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
```

In the master notification `sendMail` call, change:

```ts
				text: `${username} commented: ${plainText}. Please visit ${cleanUrl} to view it.`,
				html: `<p>${escapeHtml(username)} commented: ${safeHtml}. <br/> Please visit <a href="${cleanUrl}">${cleanUrl}</a> to view it.</p>`,
```

- [ ] **Step 5: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors. (`processedContent` is no longer referenced anywhere.)

- [ ] **Step 6: Commit**

```bash
git add app/api/comInsert/route.ts
git commit -m "fix(comment): send sanitized plaintext in notification emails"
```

---

## Task 5: Render sanitized HTML in a block container in `CommentList`

**Files:**
- Modify: `components/CommentList/index.tsx`

A `<p>` cannot legally contain block-level Markdown output (`blockquote`, `pre`, lists, tables). Switch to a `<div>` carrying the `comment-content` class.

- [ ] **Step 1: Replace the content `<p>` with a styled `<div>`**

Find this block (around lines 73-79):

```tsx
							<div className="flex-1 flex flex-col">
								<div className="flex-1 flex justify-between items-center">
									<p
										className="text-gray-700 dark:text-gray-300"
										dangerouslySetInnerHTML={{ __html: comment.content }}
									></p>
								</div>
```

Replace it with:

```tsx
							<div className="flex-1 flex flex-col">
								<div className="flex-1">
									<div
										className="comment-content"
										dangerouslySetInnerHTML={{ __html: comment.content }}
									></div>
								</div>
```

(The `justify-between items-center` classes are removed from the inner wrapper because the content is now a full-width block, not a centered inline element.)

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add components/CommentList/index.tsx
git commit -m "feat(comment): render comments in block container for markdown"
```

---

## Task 6: Add `.comment-content` prose styling

**Files:**
- Modify: `app/globals.css`

Add a prose block mirroring `.article-content` but tuned tighter for comment scale.

- [ ] **Step 1: Add the styles inside the existing `@layer`/`@apply` section**

In `app/globals.css`, immediately after the `.article-content td { ... }` rule (around line 143) and BEFORE the closing `}` of that block, add:

```css
    /* Comment content styling - compact prose for user comments */
    .comment-content {
        @apply text-base text-gray-700 dark:text-gray-300 break-words;
    }

    .comment-content > * + * {
        @apply mt-3;
    }

    .comment-content h1,
    .comment-content h2,
    .comment-content h3 {
        @apply text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2;
    }

    .comment-content p {
        @apply leading-7;
    }

    .comment-content a {
        @apply text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500;
    }

    .comment-content strong {
        @apply font-semibold text-gray-900 dark:text-white;
    }

    .comment-content em {
        @apply italic;
    }

    .comment-content ul {
        @apply my-3 ml-6 list-disc;
    }

    .comment-content ol {
        @apply my-3 ml-6 list-decimal;
    }

    .comment-content li {
        @apply my-1 leading-7;
    }

    .comment-content li::marker {
        @apply text-gray-400 dark:text-gray-500;
    }

    .comment-content blockquote {
        @apply my-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400;
    }

    .comment-content blockquote p {
        @apply my-1;
    }

    .comment-content pre {
        @apply my-3 p-3 rounded-lg overflow-x-auto text-sm bg-gray-100 dark:bg-gray-900;
    }

    .comment-content code:not(pre code) {
        @apply text-sm bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded font-mono;
    }

    .comment-content img {
        @apply rounded-lg my-3 max-w-full h-auto;
    }

    .comment-content hr {
        @apply my-4 border-gray-200 dark:border-gray-700;
    }

    .comment-content table {
        @apply my-3 w-full text-sm;
    }

    .comment-content th {
        @apply text-left font-semibold text-gray-900 dark:text-white p-2 border-b border-gray-200 dark:border-gray-700;
    }

    .comment-content td {
        @apply p-2 border-b border-gray-100 dark:border-gray-800;
    }
```

- [ ] **Step 2: Verify the build compiles the CSS**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (CSS is not type-checked, but this confirms nothing else broke). Visual verification happens in Task 8.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style(comment): add comment-content prose styling"
```

---

## Task 7: Add the localized "Markdown supported" hint to the form

**Files:**
- Modify: `lib/dictionaries/en.json`
- Modify: `lib/dictionaries/zh.json`
- Modify: `components/CommentForm/index.tsx`
- Modify: `components/Comment/index.tsx`

- [ ] **Step 1: Add the `MarkdownTip` key to `lib/dictionaries/en.json`**

In the `"comment"` object, after the `"CommentError"` line add a comma and:

```json
		"MarkdownTip": "Markdown and basic HTML are supported."
```

- [ ] **Step 2: Add the `MarkdownTip` key to `lib/dictionaries/zh.json`**

In the `"comment"` object, after the `"CommentError"` line add a comma and:

```json
		"MarkdownTip": "支持 Markdown 与基础 HTML 语法。"
```

- [ ] **Step 3: Add `MarkdownTip` to the `CommentDict` interface in `components/CommentForm/index.tsx`**

In the `interface CommentDict { ... }` block, add:

```ts
  MarkdownTip: string
```

- [ ] **Step 4: Render the hint under the textarea in `components/CommentForm/index.tsx`**

Find the textarea block:

```tsx
					<textarea
						id="content"
						name="content"
						placeholder={dict.CommentPlaceholder}
						required
						className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32 dark:text-white"
					/>
```

Immediately after the `</textarea>` (self-closing `/>`), add:

```tsx
					<p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
						{dict.MarkdownTip}
					</p>
```

- [ ] **Step 5: Add `MarkdownTip` to the `CommentDict` interface in `components/Comment/index.tsx`**

The `dict` object flows from `Comment` into `CommentForm`, so `Comment`'s `CommentDict` must also declare the key or TypeScript will reject the prop. In the `interface CommentDict { ... }` block, add:

```ts
  MarkdownTip: string
```

- [ ] **Step 6: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/dictionaries/en.json lib/dictionaries/zh.json components/CommentForm/index.tsx components/Comment/index.tsx
git commit -m "feat(comment): add localized markdown-supported hint to form"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all `renderComment` tests green.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: PASS — no new lint errors.

- [ ] **Step 4: Production build**

Run: `pnpm build`
Expected: build completes successfully. (Requires the project's `.env` with `NEXT_PUBLIC_*` values present, as for any build.)

- [ ] **Step 5: Manual smoke test (dev server)**

Run: `pnpm dev`, open a post page, and confirm in the comment area:
- Existing comments render (no raw HTML tags leaking as text, no console XSS).
- A new comment with Markdown (`# H`, `**bold**`, a list, a fenced code block, a link) renders neatly and the link opens in a new tab.
- The "Markdown supported" hint shows under the textarea (switch locale to confirm zh/en).
- The Quote button still produces a working quoted reply.

Note: do not submit test comments against the production-shared Supabase database without authorization. Use a local/staging Supabase project for submission testing, or verify rendering against existing comments only.

---

## Self-review notes

- **Spec coverage:** renderer + sanitize (Task 2) · sanitize-on-read (Task 3) · email path (Task 4) · block container (Task 5) · prose styling (Task 6) · localized hint (Task 7) · vitest XSS battery (Task 2) · new deps (Task 1). All spec sections mapped.
- **Quote compatibility** is asserted by a test in Task 2 and re-checked manually in Task 8.
- **Production DB safety** (per project memory): no test rows are inserted by the automated tests; manual submission testing is gated behind a local/staging DB note.
