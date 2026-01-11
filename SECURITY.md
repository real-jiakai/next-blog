# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 5.x     | :white_check_mark: |
| 4.x     | :x:                |
| < 4.0   | :x:                |

Only the latest major version (v5.x) receives security updates.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email the maintainer directly at: **gujiakai28@gmail.com**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days (depending on severity)

### What to Expect

- Acknowledgment of your report
- Regular updates on the fix progress
- Credit in the security advisory (unless you prefer anonymity)
- Notification when the fix is released

## Security Best Practices

When deploying this blog:

1. **Environment Variables**: Never commit `.env.local` or expose API keys
2. **Supabase**: Use Row Level Security (RLS) policies
3. **Cloudflare Turnstile**: Keep secret keys server-side only
4. **Dependencies**: Regularly run `pnpm audit` to check for vulnerabilities

Thank you for helping keep this project secure!
