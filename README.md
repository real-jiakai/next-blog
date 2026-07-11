[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![MIT](https://img.shields.io/github/license/real-jiakai/next-blog?style=plastic)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fgujiakai.top)

## Introduction

This repo stores my [weekly website](https://gujiakai.top) source code.

> Blog theme based on [Simple](https://github.com/simple-is-awesome/simple) project.

The site uses Next.js 16, React 19, local Markdown content, and bilingual
prefix-less Chinese/`/en` routes. Posts are rendered and sanitized on the
server; optional comments run through a server-only Supabase API with
Cloudflare Turnstile.

## Development

Node.js 24.10 or newer within the Node 24 release line is required. Corepack installs the pnpm version pinned by the
repository:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm dev
```

Before opening a pull request, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for environment setup, post format, and
the full deployment notes. Post changes require a rebuild because pages,
sitemap entries, and Atom feeds are generated from Markdown at build time.

## Updates

- 2025.7.23

互联网本质上是脆弱的，2月份当时看到竹白下线我只顾感慨却不想竹白存储了这个站点的一部分文章图片，今天发现后，感慨万千。1～8篇文章图片全部没了。

![竹白下线](https://cdn.sa.net/2025/07/23/wJ3HCyu9F6Ak5Qz.webp)

## Acknowledgements

- Made with ❤️ with Claude Code.
