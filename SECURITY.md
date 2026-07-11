# Security Policy

## Supported code

Security fixes are applied to the current `main` branch. Older tags and forks are not maintained.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Email **gujiakai28@gmail.com** with:

- a description of the issue and its impact;
- reproducible steps or a minimal proof of concept;
- affected routes, commits, or versions; and
- a suggested mitigation, if available.

The maintainer will acknowledge the report, investigate it, and coordinate disclosure when a fix is ready. Please avoid accessing data that is not yours or disrupting the production service while testing.

## Deployment guidance

- Keep environment files and credentials out of Git and container build contexts.
- Enforce Supabase Row Level Security and least-privilege grants.
- Validate Cloudflare Turnstile tokens on the server.
- Keep `COMMENT_API_ENABLED=false` until the comment migration and all secrets
  are configured.
- Trust only the client-IP header that the loopback reverse proxy overwrites;
  set `COMMENT_CLIENT_IP_HEADER` to that exact header name.
- Keep production dependencies and base images updated.
- Run `pnpm audit` and the repository's CI checks regularly.
