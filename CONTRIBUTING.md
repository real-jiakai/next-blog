# Contributing to the multilingual Next.js blog

Thank you for contributing.

## Prerequisites

- Node.js 24 is required (the exact development version is in `.node-version`; the supported range is Node.js 24.10 through the latest Node.js 24 release).
- pnpm 11.5.2, managed by Corepack from the `packageManager` field.

Enable the pinned package manager and install dependencies:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
```

## Local setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/next-blog.git
   cd next-blog
   ```

2. Create `.env.local`. There is intentionally no committed environment file to copy. At minimum, local builds need:

   ```dotenv
   NEXT_PUBLIC_SITE_URL=https://example.com
   NEXT_PUBLIC_SITE_TITLE=My Blog
   NEXT_PUBLIC_SITE_DESCRIPTION=My blog description
   NEXT_PUBLIC_POSTS_PERPAGE=10
   NEXT_PUBLIC_GITHUB_REPO=https://github.com/YOUR_USERNAME/next-blog
   NEXT_PUBLIC_SHOW_COMMENT=false
   ```

   The comment feature additionally needs Supabase, Turnstile, and email settings. Keep all secret values server-side and out of Git.

3. Start the development server:

   ```bash
   pnpm dev
   ```

## Quality checks

Run the same checks as CI before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
```

The production build also regenerates both Atom feeds and validates their required site metadata.

## Adding posts

Posts live in `posts/<locale>/` as Markdown files:

```markdown
---
title: "Post title"
date: "2026-01-10"
slug: "post-slug"
summary: "Brief description"
draft: false
---

Post content goes here.
```

Use filenames that are valid on Windows, macOS, and Linux. In particular, avoid `?`, `*`, `:`, `"`, `<`, `>`, `|`, and path separators.

Post content is read while Next.js builds the site. After adding or changing a post, rebuild and redeploy the application; mounting a different `posts` directory into an already-built container does not refresh static pages, the sitemap, or feeds.

When image URLs change, run `pnpm images:metadata` and commit the regenerated
`lib/post-image-dimensions.json`. The build tests require measured dimensions
for every post image so browsers can reserve the correct layout space.

## Comments and deployment

The Docker image uses standalone Next.js output and accepts secrets only at
runtime. To enable comments:

1. Apply `supabase/migrations/202607100001_secure_comments.sql` to Supabase.
2. Build with `NEXT_PUBLIC_SHOW_COMMENT=true` and a
   `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`.
3. At runtime, set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `CLOUDFLARE_TURNSTILE_SECRET_KEY`, and a random
   `COMMENT_EMAIL_VERIFICATION_SECRET` of at least 32 characters. Add SMTP
   settings when verification/reply email should be delivered. When
   `COMMENT_API_ENABLED` is omitted, the API follows the build-time
   `NEXT_PUBLIC_SHOW_COMMENT` value carried into the Docker runner. Set it
   explicitly to `false` for an emergency runtime kill switch, or to `true`
   for an explicit override.
4. Set `COMMENT_CLIENT_IP_HEADER` to exactly one header overwritten by the
   trusted reverse proxy. Put it in `.env.local`; for Caddy's default proxy
   headers use `x-forwarded-for`. Do not pass a client-supplied value through
   unchanged, and never expose the application port directly when trusting a
   forwarding header.

Existing comments deliberately remain unverified after the migration and will
not receive reply email until their owners complete a new verification flow.
Before validating the migration's legacy-row constraints, follow the cleanup
queries and `VALIDATE CONSTRAINT` instructions embedded in the SQL file.

The application container binds only to `127.0.0.1`, drops Linux capabilities,
and is read-only apart from its declared temporary filesystems. Post changes
must be rebuilt into a new image.

## Project structure

```text
app/             Next.js App Router pages and route handlers
components/      React components
lib/             Content, localization, and shared utilities
posts/en/        English Markdown posts
posts/zh/        Chinese Markdown posts
public/          Static files and generated Atom feeds
scripts/         Build-time scripts
```

Use a focused branch, follow the existing TypeScript and Tailwind conventions, and use a Conventional Commit message so semantic-release can classify the change.
