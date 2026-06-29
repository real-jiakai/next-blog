# Comment System: Markdown + Safe HTML Rendering

**Date:** 2026-06-29
**Status:** Approved design, pending implementation plan

## Problem

The blog comment system has two issues:

1. **Live stored-XSS vulnerability.** `components/CommentList/index.tsx` renders raw,
   unsanitized comment content from the database with `dangerouslySetInnerHTML`. The
   write path (`app/api/comInsert/route.ts`) and read path (`app/api/comSelect/route.ts`)
   both pass `content` through verbatim. Any comment containing `<script>` or
   `<img onerror=...>` executes for every visitor.
2. **No Markdown support.** Commenters can only submit plain text / raw HTML. There is no
   Markdown rendering, so comments cannot use headings, lists, code blocks, emphasis, etc.

## Goals

- Render comment content as **GitHub-flavored Markdown plus a safe subset of inline HTML**.
- **Neutralize XSS** — strip `<script>`, `<iframe>`, `on*` event handlers, `javascript:`
  and `data:` URLs, and inline `style`.
- Keep the existing **Quote feature** working (it injects `<blockquote><pre>…</pre><p>…</p></blockquote>`).
- Render comments with a **neat, attractive layout** consistent with article content.
- Close the secondary **email-injection** path in the notification emails.

## Non-Goals

- No live preview or editor toolbar in the comment form (only a short "Markdown supported" hint).
- No write-time caching / DB migration. Rendering happens on read; caching can be added later
  if comment volume ever warrants it.
- No comment editing/deletion features. Out of scope.

## Chosen Approach: Server-side, sanitize on read

Render Markdown + HTML to **safe HTML inside `comSelect` (on read)**, reusing the existing
`unified` (remark/rehype) stack already used for posts, and adding `rehype-sanitize`.

### Why this approach

- **Reuses existing dependencies** — no new client-side bundle weight. The only new runtime
  dep is `rehype-sanitize`.
- **Retroactively fixes the vulnerability** — every existing row is sanitized on each read,
  so already-stored malicious content is neutralized without a data migration.
- **Always uses the latest sanitizer rules**, and keeps the original Markdown source in the DB
  as the single source of truth.

### Alternatives rejected

- **Client-side `marked` + `DOMPurify`:** adds ~50KB to the client, diverges from the existing
  `unified` stack, and leaves the server/email path unprotected.
- **Sanitize on write, store HTML:** does not fix already-poisoned rows; rule changes do not
  re-clean old data; loses the Markdown source.

## Architecture

### Data flow (after change)

```
CommentForm (textarea: Markdown + optional safe HTML)
  -> POST /api/comInsert
       - stores raw Markdown source in DB (unchanged storage)
       - emails: commentToPlainText(content) for safe, readable notifications
  -> GET /api/comSelect
       - renderCommentHtml(content) -> safe HTML for each row
  -> CommentList renders safe HTML in <div class="comment-content">
```

### Components / units

**1. `lib/renderComment.ts` (new) — the one place that converts and sanitizes.**

- `renderCommentHtml(markdown: string): Promise<string>`
  Pipeline: `remarkParse → remark-gfm → remark-rehype({ allowDangerousHtml: true }) →
  rehype-raw → hardenLinks → rehype-sanitize(schema) → rehype-stringify`. Returns safe HTML.
- `commentToPlainText(markdown: string): string`
  Strips Markdown/HTML to plain text for email notifications.
- **Link hardening (`hardenLinks`):** a tiny inline rehype plugin using `unist-util-visit`
  (already installed) that sets `target="_blank"` and `rel="nofollow noopener noreferrer"` on
  every `<a>`. It runs BEFORE `rehype-sanitize` so the sanitizer validates the final attributes.
  (`rehype-sanitize` only strips — it cannot add attributes — hence a separate plugin.)
- **Sanitize schema:** start from `rehype-sanitize`'s GitHub `defaultSchema`, then:
  - Ensure the Quote feature's tags are allowed (`blockquote`, `pre`, `p`, `br` — all already
    in the default schema).
  - Extend the allowed attributes on `a` to include `target` and `rel` so the hardened values
    survive sanitization (the default schema allows `href` but not `target`).
  - Confirm `<script>`, `<iframe>`, `on*` attributes, `javascript:`/`data:` URLs, and inline
    `style` are excluded (default behavior; verified by tests).

  *Interface:* input is an untrusted Markdown/HTML string; output is a sanitized HTML string.
  *Depends on:* `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-raw`,
  `rehype-sanitize`, `rehype-stringify`, `unist-util-visit` (all but `rehype-sanitize` already
  installed).

**2. `app/api/comSelect/route.ts` (modify).**
Map each fetched row through `renderCommentHtml(row.content)` before returning, so the
`content` field is safe HTML. Drop-in replacement for the value `CommentList` already consumes.
All existing URL-matching logic is unchanged.

**3. `app/api/comInsert/route.ts` (modify).**
Replace the `processedContent` regex (which strips `<blockquote>`/`<br/>`) with
`commentToPlainText(content)` for the notification email bodies (both reply and master
emails). DB still stores the raw Markdown source. Turnstile verification unchanged.

**4. `components/CommentList/index.tsx` (modify).**
Change the content holder from
`<p className="..." dangerouslySetInnerHTML=... />`
to
`<div className="comment-content text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML=... />`.
Rationale: a `<p>` cannot legally contain block elements (`blockquote`, `pre`, lists, tables)
produced by Markdown. Content is already sanitized server-side.

**5. `components/CommentForm/index.tsx` (modify).**
Add a small "Markdown supported" hint line under the comment textarea, sourced from the `dict`
object so it is localized (zh/en). Add the corresponding key to the dictionaries.

**6. `app/globals.css` (modify).**
Add a `.comment-content` prose block mirroring the existing `.article-content` rules but tuned
tighter for comment scale: headings, `p`, `ul`/`ol`/`li`, `a`, `strong`/`em`, `pre`,
inline `code`, `blockquote`, `table`/`th`/`td`, `img`, `hr`. Dark-mode aware.

**7. Dictionaries (`lib/dictionaries/*`) (modify).**
Add a `MarkdownSupported` (or similar) key for the form hint in each locale.

## Sanitization contract (security-critical)

The sanitizer MUST:

- Remove `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`.
- Remove all `on*` event-handler attributes (`onerror`, `onclick`, `onload`, …).
- Remove `javascript:` and `data:` URLs in `href`/`src`.
- Remove inline `style` attributes.
- Preserve safe Markdown output: headings, paragraphs, lists, tables, `pre`/`code`,
  `blockquote`, `strong`/`em`, links (hardened with `rel`/`target`), images with http(s) `src`.

## Testing

Add `vitest` as a devDependency and a `test` script. Write `lib/renderComment.test.ts` covering:

**Must be neutralized (assert no script execution / dangerous attributes remain):**
- `<script>alert(1)</script>`
- `<img src=x onerror=alert(1)>`
- `<a href="javascript:alert(1)">x</a>`
- `<iframe src="…"></iframe>`
- `<div onclick="alert(1)">x</div>`
- `[x](javascript:alert(1))` (Markdown link with javascript: URL)
- inline `style="…"` attribute

**Must be preserved:**
- Headings, bold/italic, ordered/unordered lists, tables, fenced code blocks, inline code.
- The Quote feature's `<blockquote><pre>…</pre><p>…</p></blockquote>` structure.
- Links get `rel="nofollow noopener noreferrer"` and `target="_blank"`.

`commentToPlainText` test: HTML/Markdown input yields readable plain text with tags removed.

## New dependencies

- `rehype-sanitize` — runtime.
- `vitest` — devDependency (security tests).

## Risks / notes

- **Production-shared Supabase DB.** Per project memory, the comments DB is production-shared.
  Do NOT insert test rows during development without authorization. Tests for `renderComment.ts`
  operate purely in-memory on strings and never touch the database.
- **Quote re-processing.** The Quote feature places HTML into the textarea; on resubmit it is
  stored as raw Markdown/HTML source and re-rendered through `rehype-raw` + sanitize on read.
  This round-trips cleanly and is verified by the test that preserves the blockquote structure.
- **Per-read render cost** is acceptable for personal-blog comment volumes; caching is an
  explicit non-goal for now.
