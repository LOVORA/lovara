# LOVORA

LOVORA is a premium AI character platform built with Next.js, React, TypeScript, Supabase, OpenRouter, and Runware.

## Features

- Discover built-in and public AI characters
- Create and manage custom characters
- Share public character pages
- Roleplay chat with memory and scenario bootstrapping
- Identity-locked photo studio workflow
- Internal admin panel for character visibility controls

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
- OpenRouter
- Runware
- Tailwind CSS

## Environment

Copy `.env.example` to `.env.local` for local work.

Core runtime envs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `RUNWARE_API_KEY`
- `RUNWARE_BASE_URL`
- `RUNWARE_MODEL`
- `RUNWARE_CREATE_AVATAR_MODEL`
- `NEXT_PUBLIC_CHARACTER_IMAGES_BUCKET`

Admin-only envs:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USER_IDS`

Script-only envs:

- `DEMO_PUBLIC_CHARACTER_OWNER_ID`

Rules:

- Never commit `.env.local` or real secret values.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- For Vercel, add env values in the project dashboard instead of storing them in repo files.

## Local Development

```bash
npm install
npm run dev
```

## Production / Public Launch Checklist

- Confirm `.env*` files are not tracked.
- Rotate any key that may have been pasted into public channels or old history.
- Add production env values in Vercel.
- Apply Supabase migrations before deploy.
- Verify `/admin` is only available for IDs in `ADMIN_USER_IDS`.
- Run:

```bash
npx tsc --noEmit --pretty false
npm run lint -- --max-warnings=0
npm run build
```

## Security Notes

- Production security headers are configured in `next.config.ts`.
- Session refresh wiring lives in the root `proxy.ts`.
- Admin writes rely on `SUPABASE_SERVICE_ROLE_KEY`.
- Demo and backfill scripts are repo utilities only; they are not part of runtime hosting.
