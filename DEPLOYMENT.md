# Deployment — Docker + CloudFront + S3

How the pieces fit together in production (spidermania.in):

```
Browser ──► CloudFront (CDN, TLS, compression, edge cache)
                │  single origin: the app
                ▼
            Next.js container (Docker, node server.js)
                │                        │
                ▼                        ▼
            MySQL 8                  S3 bucket (PRIVATE)
                                     via AWS SDK only
```

CloudFront has **one origin: the app**. It is never pointed at the S3 bucket.
Uploaded media is only reachable through `/api/media/[id]`, which checks
approval/ownership on every cache miss and tells CloudFront what is cacheable
via `Cache-Control` (public media: `s-maxage=86400`; pending/private media:
`private, no-store`). That keeps the moderation rules in one place and still
serves approved media from the edge.

---

## 1. Docker

```bash
cp .env.example .env        # compose reads .env (not .env.local); fill it in
docker compose up -d --build
docker compose run --rm migrate node scripts/seed-admin.js   # once, per fresh DB
```

- `db` — MySQL 8.4 (the schema needs 8.0+: `utf8mb4_0900_ai_ci`, `DATETIME(3)`).
  Data persists in the `db-data` volume.
- `migrate` — one-shot, applies `migrations/*.sql` (idempotent) before the app
  starts. Seeding is manual on purpose: `seed-admin.js` bumps `token_version`
  and would log out live admin sessions if it ran on every boot.
- `app` — standalone Next server on port 3000, non-root user. `DB_HOST` is
  forced to `db`; everything else comes from `.env`.

The image is built from `output: "standalone"` (next.config.mjs): only the
traced server bundle ships, with `public/`, `.next/static`, plus `scripts/` +
`migrations/` for the one-off jobs. `next build` needs no database.

**Uploads volume.** With `STORAGE_DRIVER=local`, media lands in the `uploads`
volume. Each media row records the driver that stored it, so after switching
to `STORAGE_DRIVER=s3` the old rows still read from disk — keep the volume
mounted (or migrate the files into the bucket) after switching. Production
should run `STORAGE_DRIVER=s3` so media survives container replacement.

**Deploys.** Bake a version into the image so clients on an old tab don't mix
chunks across builds behind the CDN (next.config `deploymentId` → `?dpl=`):

```bash
DEPLOYMENT_ID=$(git rev-parse --short HEAD) docker compose up -d --build app
```

`stop_grace_period: 30s` lets Next drain in-flight requests on shutdown.

---

## 2. S3 (media storage)

Create the bucket and **keep it fully private** — this is a hard invariant of
the backend design (BACKEND.md §10):

- Block Public Access: **all four ON**. No public-read bucket policy, ever.
- No CORS config needed (only the server talks to S3, via the SDK).
- Default encryption (SSE-S3) is fine.

IAM user (or instance role) for the app — least privilege:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
    }
  ]
}
```

`.env`:

```
STORAGE_DRIVER=s3
S3_BUCKET_NAME=your-bucket
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

(`S3_ENDPOINT` / `S3_FORCE_PATH_STYLE` stay empty for real S3 — they exist for
R2/MinIO/Spaces.)

### One bucket, prefixed keys (no real folders)

Everything lives in **one bucket**. S3 has no folders — the `/` in an object
key is just part of the name that the console *renders* as a folder. The code
already writes keys under fixed prefixes (`lib/server/uploads.js` →
`${subdir}/${randomHex}.${ext}`), so the same layout you have on local disk
appears in the bucket automatically:

```
your-bucket/
├── posts/          forum post attachments        (app/api/forum/posts)
├── avatar-cards/   avatar card art AND profile    (app/api/admin/avatars/card-asset)
│                   pictures — same endpoint, same prefix
└── fan-art/        fan-art submissions            (app/api/fan-art)
```

Notes:

- **Profile pics and card art share `avatar-cards/`.** The admin panel uploads
  both through the one `card-asset` endpoint, which passes the `avatar-cards`
  prefix. Filenames are random 32-hex, so there's no collision — they simply
  coexist in that prefix. (If you ever want them split, change the `subdir`
  arg at the upload call site; nothing else depends on the prefix.)
- **Keys are opaque and content-addressed by random hex**, not by user or date.
  Access control is the DB row + `/api/media/[id]`, never the key path — so the
  prefix is purely organizational.
- **No setup needed in S3.** Don't pre-create the prefixes; `PutObject` with a
  key like `posts/ab12….jpg` makes the prefix appear. Switching
  `STORAGE_DRIVER` local→s3 keeps the exact same keys, so `getObjectStream`
  reads them back unchanged.

---

## 3. CloudFront (CDN)

One distribution, alternate domain `spidermania.in` (+ ACM cert), **origin =
the app** (ALB/EC2/host running the container). Enable *Compress objects
automatically* on every behavior. Origin protocol HTTPS (or HTTP to a
localhost-only ALB), viewer protocol *Redirect HTTP to HTTPS*.

Behaviors, most specific first:

| Path pattern          | Cache policy                                   | Origin request policy | Why |
|-----------------------|------------------------------------------------|-----------------------|-----|
| `/_next/static/*`     | `CachingOptimized` (managed)                   | none                  | Content-hashed files; Next hard-codes `max-age=31536000, immutable`. Cache forever. |
| `/_next/image*`       | Custom: **query strings `url`,`w`,`q` + header `Accept`** in key, respect origin headers | forward `Accept`      | The optimizer varies output on those three params and on `Accept` (`Vary: Accept`, webp vs original). The managed policies get this wrong (they drop query strings or `Accept`) — cache poisoning otherwise. |
| `/assets/*`           | `CachingOptimized`                             | none                  | public/ branding assets; origin now sends `max-age=86400, stale-while-revalidate=604800` (next.config headers()). |
| `/api/avatar-cards/*` | `CachingOptimized`                             | none                  | Random-hex immutable card art; origin sends `max-age=31536000, immutable`. No auth. |
| `/api/media/*`        | Custom: **nothing in key** (no cookies/headers/query), MinTTL 0, respect origin headers | `AllViewer` (managed) | The gateway decides per response: approved media → `public, s-maxage=86400` (cached, one copy for everyone); pending/owner previews → `private, no-store` (never cached). Cookies must be **forwarded** (owner/admin previews authenticate at origin) but must **not** be in the cache key. |
| `/api/*`              | `CachingDisabled` (managed)                    | `AllViewer`           | Live JSON over MySQL; route handlers are dynamic by design (BACKEND.md §2). |
| `/admin*`             | `CachingDisabled`                              | `AllViewer`           | Cookie-gated panel; proxy.js redirects must always run at origin. |
| Default `/*`          | `CachingDisabled`                              | `AllViewer`           | Every page is a client shell that personalizes via `/api/me` — the HTML is tiny; caching it buys little and couples deploys to CDN purges (Next 16 would also require the `_rsc` query param in the cache key to not break client-side navigation). All the heavy traffic (JS/CSS/images/media) is already cached above. |

`AllViewer` forwards `Host`, cookies, and `Origin` to the app — required for
sessions and for the Origin/Host CSRF check on mutating handlers (BACKEND.md
§5.2). If your origin infrastructure can't accept the viewer `Host` header,
use `AllViewerExceptHostHeader` and set `NEXT_PUBLIC_APP_URL=https://spidermania.in`.

### Invalidations

CloudFront only re-checks the origin when a TTL expires, so:

- **Fan-art rejected / media deleted after approval** — it can live at the
  edge up to 24h. To pull it immediately:
  `aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/api/media/<id>"`
- **Replaced a file in `public/assets/` under the same name** — up to 24h
  stale: `--paths "/assets/*"`.
- **Regular deploys** — nothing to invalidate: HTML isn't cached, JS/CSS
  filenames are content-hashed, and `?dpl=` busts anything else.

### Things to never do here

- Don't add an S3 origin or make the bucket public — it bypasses the approval
  gateway (the whole moderation model).
- Don't render user media through `next/image` — the optimizer fetches the
  `src` without cookies (auth 401s on miss) and serves disk-cache hits without
  re-invoking the route at all (auth bypass). User media stays on plain
  `<img>`/`<video>` tags, which the code already does; `next/image` is only
  used for the static hero art.
- Don't set `assetPrefix` — it's for serving `_next/static` from a *separate*
  CDN domain; with CloudFront in front of the whole site it adds nothing but
  an extra DNS/TLS hop.
