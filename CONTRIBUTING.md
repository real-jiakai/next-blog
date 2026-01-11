# Contributing to Next.js Multilingual Blog

Thank you for considering contributing to this project! Your help and support are highly appreciated.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (for comments)
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18+
- pnpm 9+

## Getting Started

1. **Fork the repository** to your GitHub account

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/next-blog-multilingual.git
   cd next-blog-multilingual
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

5. **Start the development server**:
   ```bash
   pnpm dev
   ```

## Development Workflow

1. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the existing code style

3. **Run linting** before committing:
   ```bash
   pnpm lint
   ```

4. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve specific issue"
   ```

5. **Push to your fork** and create a pull request

## Code Style Guidelines

- Use TypeScript for all new files
- Follow existing naming conventions
- Use functional components with hooks
- Keep components focused and single-purpose
- Use Tailwind CSS for styling

## Project Structure

```
├── app/                 # Next.js App Router pages
│   ├── [lang]/         # Locale-specific routes
│   └── api/            # API routes
├── components/         # React components
├── lib/               # Utility functions and configurations
│   ├── dictionaries/  # i18n translation files
│   └── posts/         # Post processing utilities
├── posts/             # Markdown blog posts
│   ├── en/           # English posts
│   └── zh/           # Chinese posts
└── public/            # Static assets
```

## Adding Blog Posts

Posts are stored in `posts/[locale]/` as Markdown files with frontmatter:

```markdown
---
title: "Post Title"
date: "2025-01-10"
slug: "post-slug"
tags: ["tag1", "tag2"]
summary: "Brief description"
---

Your content here...
```

## Questions?

Feel free to open an issue if you have any questions or need clarification.

Thank you for contributing!
