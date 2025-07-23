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
- **Framework**: Next.js 15 with App Router disabled (using Pages Router)
- **Styling**: Tailwind CSS 4.x with dark mode support
- **Content**: Markdown posts with frontmatter, processed via unified/remark/rehype
- **Internationalization**: next-translate with Chinese (zh) as default locale and English (en) support
- **Database**: Supabase for comments and user data
- **AI Integration**: Gemini API for content summarization
- **Theme**: next-themes for dark/light mode switching

### Content Management
- **Posts Directory**: `/posts/` contains Markdown files with frontmatter metadata
- **Post Processing**: Uses unified pipeline with remark-gfm, rehype-prism-plus, rehype-slug, rehype-autolink-headings
- **URL Structure**: `/[year]/[month]/[slug]` for individual posts
- **Features**: Tags, search functionality, pagination, RSS feed generation, sitemap

### Key Components
- **Layout**: Main layout wrapper with Header, Footer, and ScrollToTop
- **ArticleLayout**: Individual post layout with optional table of contents
- **AISummary**: AI-powered content summarization using Gemini API
- **Comment System**: Supabase-backed commenting with CommentForm and CommentList
- **Search**: Full-text search across titles, content, tags, and summaries
- **Navigation**: Tag-based filtering, pagination, archive views

### API Routes
- `/api/gemini.js` - Streams AI summaries using Gemini 2.5 Flash Lite
- `/api/deepseek.js` - Alternative AI endpoint
- `/api/comInsert.js` & `/api/comSelect.js` - Comment CRUD operations

### Environment Variables Required
- `GEMINI_BASE_URL` & `GEMINI_API_KEY` - For AI summarization
- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` - For database

### Content Structure
Posts use frontmatter with fields: `title`, `date`, `slug`, `tags`, `summary`, `draft`, `showtoc`, `audio`

### Build Process
- Includes semantic-release for automated versioning
- Husky pre-commit hooks run linting
- Bundle analyzer available via ANALYZE environment variable
- RSS feed and sitemap generation in postbuild step