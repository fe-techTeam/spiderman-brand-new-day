This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend & admin panel

The full backend design (MySQL schema, APIs, auth, moderation, build phases) lives in
[BACKEND.md](BACKEND.md). One-time setup:

```bash
cp .env.example .env.local   # fill in DB creds, JWT secrets (openssl rand -base64 48), admin seed
npm run db:setup             # creates the database, applies migrations/, seeds the super admin
```

The admin console is at `/admin` (login with the `ADMIN_SEED_*` credentials). Admin auth is
fully separate from portal-user auth — different table, cookie, and JWT secret — with role-based
access (super_admin / moderator / content_manager) enforced per API route.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

Self-hosted via Docker, with CloudFront as the CDN in front of the app and a
private S3 bucket for user media. See [DEPLOYMENT.md](DEPLOYMENT.md) for the
full workflow (compose commands, S3 bucket policy, CloudFront behaviors and
invalidations).

```bash
cp .env.example .env        # compose reads .env; fill in DB/JWT/S3 values
docker compose up -d --build
docker compose run --rm migrate node scripts/seed-admin.js   # once
```
