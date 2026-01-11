# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm clean` or `pnpm clear` - Remove `.next` directory
- `ANALYZE=true pnpm build` - Build with bundle analyzer

## Tools

You can use the Tools below:

- Context7 MCP Integration: Access technical documentation for Next.js, Tailwind CSS, Pnpm, and more.
- DeepWiki MCP Integration: Access GitHub Repo Wiki Docs.

## Architecture Overview

This is a Next.js blog application with the following key characteristics:

### Core Technologies
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4.x with dark mode support
- **Content**: Markdown posts with frontmatter, processed via unified/remark/rehype
- **Internationalization**: Native Next.js i18n with Chinese (zh) as default locale and English (en) support
- **Database**: Supabase for comments
- **Theme**: next-themes for dark/light mode switching

### Content Management
- **Posts Directory**: `/posts/[locale]/` contains Markdown files with frontmatter metadata (e.g., `/posts/zh/`, `/posts/en/`)
- **Post Processing**: Uses unified pipeline with remark-gfm, rehype-prism-plus, rehype-slug, rehype-autolink-headings
- **URL Structure**: `/[lang]/[year]/[month]/[slug]` for individual posts
- **Features**: Tags, pagination, RSS feed generation, sitemap

### Key Components
- **Layout**: Main layout wrapper with Header, Footer, and ScrollToTop
- **ArticleLayout**: Individual post layout with optional table of contents
- **Comment System**: Supabase-backed commenting with CommentForm and CommentList
- **Navigation**: Tag-based filtering, pagination, archive views

### API Routes
- `/api/comInsert/route.ts` & `/api/comSelect/route.ts` - Comment CRUD operations

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` - For database
- `NEXT_PUBLIC_SITE_TITLE` - Site title
- `NEXT_PUBLIC_POSTS_PERPAGE` - Number of posts per page
- `NEXT_PUBLIC_SHOW_COMMENT` - Enable/disable comments
- `NEXT_PUBLIC_GITHUB_REPO` - GitHub repo URL for edit links

### Content Structure
Posts use frontmatter with fields: `title`, `date`, `slug`, `tags`, `summary`, `draft`, `showtoc`, `audio`

### Build Process
- Includes semantic-release for automated versioning
- Husky pre-commit hooks run linting
- Bundle analyzer available via ANALYZE environment variable
- RSS feed and sitemap generation in postbuild step
