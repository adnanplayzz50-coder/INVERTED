# INVERTED

A private, password-gated media library and GitHub AI workspace.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase Storage and database for persistent media
- GitHub OAuth and Git Data/Contents APIs for repository work
- Server-side AI provider integration

## Local setup

1. Install Node.js 20.9+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the secrets.
4. Run `npm run dev`.

## Security notes

- `SITE_PASSWORD`, `AUTH_SECRET`, GitHub OAuth secrets, AI keys, and the Supabase service-role key are server-only.
- Never add `.env.local` to Git.
- Configure the GitHub OAuth callback to match `GITHUB_REDIRECT_URI`.
- Create a private Supabase Storage bucket named `inverted-media` before enabling uploads.

## Deployment

Import this repository into Vercel and configure the environment variables in Project Settings → Environment Variables.
