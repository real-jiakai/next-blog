[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![MIT](https://img.shields.io/github/license/real-jiakai/next-blog?style=plastic)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fgujiakai.top)

## Introduction

This repo stores the source code of [周见](https://gujiakai.top), my bilingual
web periodical, published in numbered issues on no fixed schedule.

The site uses Next.js 16, React 19, local Markdown content, and bilingual
prefix-less Chinese/`/en` routes. Posts are rendered and sanitized on the
server; optional comments run through a server-only Supabase API with
Cloudflare Turnstile.

The home page is the periodical's contents page (目录 / Contents): a masthead
with the run of issues, the newest issue as the lead with its number, summary,
BGM and cover, then every earlier issue as a numbered row with its one-line
summary, grouped by year. It lists the whole run, so there is no pagination
and no separate archive; old `/page/N` and `/archive` links redirect to it.
Issues are set off by rules rather than cards, with one accent colour (竹青) and
serif figures for the issue numbers. An issue page opens with its number, date
and reading time, keeps a table of contents beside the text on wide screens,
and ends with links to the previous and next issues.

## Updates

- 2025.7.23

互联网本质上是脆弱的，2月份当时看到竹白下线我只顾感慨却不想竹白存储了这个站点的一部分文章图片，今天发现后，感慨万千。1～8篇文章图片全部没了。

![竹白下线](https://cdn.sa.net/2025/07/23/wJ3HCyu9F6Ak5Qz.webp)

## Acknowledgements

- Built and maintained with help from Claude Code and Codex.
