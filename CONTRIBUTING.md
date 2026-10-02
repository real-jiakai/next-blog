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
   # Optional English page and feed title, such as a romanised name; it falls
   # back to NEXT_PUBLIC_SITE_TITLE, which stays the brand in both languages.
   NEXT_PUBLIC_SITE_TITLE_EN=
   NEXT_PUBLIC_SITE_DESCRIPTION=My blog description
   # Optional per-language descriptions; each falls back to the generic one.
   # English pages, the English feed and llms.txt read the _EN value.
   NEXT_PUBLIC_SITE_DESCRIPTION_ZH=
   NEXT_PUBLIC_SITE_DESCRIPTION_EN=
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

The home page builds its contents list from these fields. An issue's number
is a trailing ` #N` in `title`; the visible headings drop it. A real
`summary` becomes the post's excerpt there; an empty one, or the
`本期话题：…` / `This week's topic: …` boilerplate, is replaced by the first
paragraph under the post's `## 话题` / `## Topic` heading. The lead issue's cover is the first image under
`## 封面图` / `## Cover Image`, shown only when that image is in
`lib/post-image-dimensions.json` and listed in `lib/cover-urls.json`. The
image optimizer accepts exactly those cover URLs, not the whole of
`cdn.sa.net` or `vip2.loli.net`, because anyone can upload to both hosts.

Use filenames that are valid on Windows, macOS, and Linux. In particular, avoid `?`, `*`, `:`, `"`, `<`, `>`, `|`, and path separators.

Post content is read while Next.js builds the site. After adding or changing a post, rebuild and redeploy the application; mounting a different `posts` directory into an already-built container does not refresh static pages, the sitemap, or feeds.

When image URLs change, run `pnpm images:metadata` and commit the regenerated
`lib/post-image-dimensions.json` and `lib/cover-urls.json`. The build tests
require measured dimensions for every post image so browsers can reserve the
correct layout space, and require the cover list to match the covers the
contents page shows.

## Comments and deployment

The Docker image uses standalone Next.js output and accepts secrets only at
runtime. Docker Compose reads the deployment `.env` automatically and
allowlists the runtime values passed into the container. `NEXT_PUBLIC_*`
values are build args baked into the image, so a change to one takes effect
only after `docker compose up -d --build`. To enable comments:

1. Apply `supabase/migrations/202607100001_secure_comments.sql` to Supabase.
2. Build with `NEXT_PUBLIC_SHOW_COMMENT=true` and a
   `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`.
3. At runtime, set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `CLOUDFLARE_TURNSTILE_SECRET_KEY`, and a random
   `COMMENT_EMAIL_VERIFICATION_SECRET` of at least 32 characters. Add SMTP
   settings when verification/reply email should be delivered. With Docker
   Compose, an omitted `COMMENT_API_ENABLED` takes the `NEXT_PUBLIC_SHOW_COMMENT`
   value (default `false`) from the deployment `.env` when `docker compose up`
   runs, so build and start the container with the same `.env`. A plain
   `docker run` without it follows the build-time `NEXT_PUBLIC_SHOW_COMMENT`
   baked into the runner. Set it explicitly to `false` for an emergency
   runtime kill switch, or to `true` for an explicit override.
4. `COMMENT_CLIENT_IP_HEADER` defaults to `x-forwarded-for` for this Caddy
   deployment. If the proxy setup changes, set it to exactly one of
   `x-forwarded-for`, `cf-connecting-ip`, or `x-real-ip`, whichever the
   trusted reverse proxy overwrites. Any other value is ignored, and every
   visitor then shares one rate-limit bucket. Do not pass a client-supplied
   value through unchanged, and never expose the application port directly
   when trusting a forwarding header.

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

Use a focused branch and follow the existing TypeScript and Tailwind conventions.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) so semantic-release can classify each change. After staging, run `pnpm commit`: Commitizen asks for the type, scope and description, then commits through the usual pre-commit hook. A plain `git commit` with a correctly formatted message works just as well.

The changelog generator links any `#` followed by letters or digits as a GitHub issue, so write hex colours and similar values in backticks, such as `` `#212121` ``.
