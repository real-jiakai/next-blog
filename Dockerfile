# syntax=docker.io/docker/dockerfile:1.7

FROM node:24.16.0-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies only when needed.
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only the repository-owned npm configuration. User/global npmrc files,
# credentials and all .env files are excluded from the build context.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These values are public and compiled into browser/static output. Secrets are
# deliberately not accepted as build args; inject them into the runner only.
ARG NEXT_PUBLIC_SITE_URL=https://gujiakai.top
ARG NEXT_PUBLIC_SITE_TITLE=周见
ARG NEXT_PUBLIC_SITE_DESCRIPTION=专注于分享互联网上有趣的东西。
ARG NEXT_PUBLIC_SITE_DESCRIPTION_ZH=专注于分享互联网上有趣的东西。
ARG NEXT_PUBLIC_SITE_DESCRIPTION_EN=A weekly collection of interesting things from the internet.
ARG NEXT_PUBLIC_KEYWORDS=weekly,blog
ARG NEXT_PUBLIC_FOOTER=Jiakai Gu
ARG NEXT_PUBLIC_POSTS_PERPAGE=10
ARG NEXT_PUBLIC_SHOW_COMMENT=false
ARG NEXT_PUBLIC_GITHUB_REPO=https://github.com/real-jiakai/next-blog
ARG NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
	NEXT_PUBLIC_SITE_TITLE=${NEXT_PUBLIC_SITE_TITLE} \
	NEXT_PUBLIC_SITE_DESCRIPTION=${NEXT_PUBLIC_SITE_DESCRIPTION} \
	NEXT_PUBLIC_SITE_DESCRIPTION_ZH=${NEXT_PUBLIC_SITE_DESCRIPTION_ZH} \
	NEXT_PUBLIC_SITE_DESCRIPTION_EN=${NEXT_PUBLIC_SITE_DESCRIPTION_EN} \
	NEXT_PUBLIC_KEYWORDS=${NEXT_PUBLIC_KEYWORDS} \
	NEXT_PUBLIC_FOOTER=${NEXT_PUBLIC_FOOTER} \
	NEXT_PUBLIC_POSTS_PERPAGE=${NEXT_PUBLIC_POSTS_PERPAGE} \
	NEXT_PUBLIC_SHOW_COMMENT=${NEXT_PUBLIC_SHOW_COMMENT} \
	NEXT_PUBLIC_GITHUB_REPO=${NEXT_PUBLIC_GITHUB_REPO} \
	NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY}

RUN corepack enable pnpm && pnpm run build

# Production image: standalone output contains only traced runtime files.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
	HOME=/tmp \
	PORT=3000 \
	HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:3000/robots.txt').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
