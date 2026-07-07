# Spider-Man: Brand New Day — Backend Architecture & Build Plan

> **Status:** Design approved for build. Phase 1 (frontend-only microsite) is complete; this document
> specifies the full MySQL-backed Phase 2: auth, avatar experience, forum, MJ Wall, fan art,
> notifications, and the admin panel with RBAC.
>
> **Stack:** Next.js 16.2.10 (App Router, Turbopack, route handlers + `proxy.js`), MySQL 8 (InnoDB,
> utf8mb4), `mysql2` (pooled, prepared statements), `jose` (JWT, HS256), `bcryptjs` (password
> hashing), shadcn/ui + Tailwind v4 (admin panel only).
>
> ⚠️ This repo runs Next.js 16 with breaking changes: `middleware.js` → `proxy.js` (Node runtime
> only), all request APIs are async (`await cookies()`, `await headers()`, `await params`),
> `next lint` removed, Turbopack default. Consult `node_modules/next/dist/docs/` before writing code.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Architecture & request flow](#2-architecture--request-flow)
3. [Database schema](#3-database-schema)
4. [Entity relations (ER summary)](#4-entity-relations)
5. [Auth & security](#5-auth--security)
6. [Onboarding & the Avatar Experience](#6-onboarding--the-avatar-experience)
7. [Forum](#7-forum)
8. [Notifications](#8-notifications)
9. [MJ Wall](#9-mj-wall)
10. [Fan art](#10-fan-art)
11. [Admin panel & RBAC](#11-admin-panel--rbac)
12. [Full API surface](#12-full-api-surface)
13. [Query patterns, pagination & performance](#13-query-patterns-pagination--performance)
14. [Environment & configuration](#14-environment--configuration)
15. [Build phases & milestones](#15-build-phases--milestones)
16. [Open questions for the client](#16-open-questions-for-the-client)

---

## 1. System overview

Two user populations, two completely separate auth systems:

| | Portal users (fans) | Admin users (staff) |
|---|---|---|
| Tables | `users` | `admin_users`, `admin_roles`, `admin_permissions` |
| Login UI | `AuthModal` on the microsite | `/admin/login` (shadcn/ui, standalone) |
| JWT cookie | `bnd_session` | `bnd_admin_session` |
| JWT secret | `JWT_SECRET` | `ADMIN_JWT_SECRET` (different key) |
| Route guard | DAL check in user API routes | `proxy.js` (optimistic) + DAL + per-permission check |

Content flows and their moderation model:

| Feature | Who creates | Approval required? | Admin controls |
|---|---|---|---|
| Forum posts | Users | **No** (live immediately) | Hide / unhide / delete |
| Forum comments & replies | Users | **No** | Hide / unhide / delete |
| MJ Wall messages | Users | **Yes** (pending → approved/rejected) | Approve, reject (with reason), hide later |
| Fan art | Users | **Yes** (pending → approved/rejected) | Approve, reject, hide later |
| Avatar quiz Q&A + avatar mapping | Admin (CMS) | n/a — content managed in admin panel | Full CRUD + weighted mapping editor |
| Users | Self-signup | No | Disable / enable (disabled = cannot log in; sessions die instantly) |

Everything the current frontend mocks maps to a real feature here — the mock shapes in
`lib/forumData.js`, `components/forum/ForumProvider.jsx` and `app/page.jsx` were reverse-engineered
field-by-field to derive this schema (see §3 and §7 for the mapping).

---

## 2. Architecture & request flow

```
Browser
  │
  ├─ GET /admin/**  ──────────────►  proxy.js (Node runtime)
  │                                    │  optimistic check: bnd_admin_session cookie
  │                                    │  present & verifiable? → pass through
  │                                    │  missing/invalid?      → redirect /admin/login
  │                                    ▼
  │                                  app/admin/** (server layout re-verifies via DAL)
  │
  ├─ /api/auth/**, /api/forum/**, /api/mj-wall/**, /api/fan-art/**, /api/me/** (portal APIs)
  │                                    │
  │                                    ▼
  │                            route handler → lib/server/auth.js (DAL)
  │                                    │  await verifySession() → JWT verify → SELECT user
  │                                    │  (status + token_version check on EVERY request)
  │                                    ▼
  │                            lib/server/db.js (mysql2 pool, prepared statements)
  │
  └─ /api/admin/** (admin APIs)
                                       │
                                       ▼
                             route handler → lib/server/admin-auth.js (DAL)
                                       │  verifyAdminSession() + requirePermission('mj.review')
                                       ▼
                             db pool + admin_audit_logs write for every mutation
```

Design rules (from the Next.js 16 auth & data-security guides):

- **`proxy.js` is optimistic only** — it decrypts the JWT cookie but never touches the DB. Real
  authorization happens in the Data Access Layer (`lib/server/auth.js` / `admin-auth.js`) called by
  every route handler. Layout checks are a UX nicety, never the security boundary.
- **All DB access goes through `lib/server/db.js`** — one pooled connection factory, placeholders
  (`?`) everywhere, no string-built SQL. Server-only modules import `server-only`… equivalent
  discipline: nothing under `lib/server/` is ever imported from a client component.
- **Route handlers are dynamic by default** in Next 16 (GET is not cached) — correct for an API
  over live data; no extra config needed.
- **Never return raw DB rows** — every handler maps rows → explicit response DTOs (strips
  `password_hash`, `token_version`, emails on public surfaces, etc.).

File layout added by the backend:

```
proxy.js                       ← admin route guard (Next 16 replaces middleware.js)
migrations/                    ← numbered .sql files, run in order
  001_schema.sql
  002_seed_rbac.sql
  003_seed_avatar_experience.sql
  004_seed_forum_taxonomy.sql
scripts/
  migrate.js                   ← migration runner (tracks schema_migrations)
  seed-admin.js                ← creates/updates the super admin from env vars
lib/server/
  db.js                        ← mysql2 pool singleton + query/tx helpers
  auth.js                      ← portal-user DAL (JWT create/verify, session)
  admin-auth.js                ← admin DAL (JWT + permission checks + audit log)
  validate.js                  ← tiny input validators (no new deps)
app/api/...                    ← route handlers (see §12)
app/admin/...                  ← admin panel (shadcn/ui)
components/ui/...              ← shadcn/ui primitives (admin panel only)
```

---

## 3. Database schema

MySQL 8, engine InnoDB, charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`.
All PKs are `BIGINT UNSIGNED AUTO_INCREMENT`. All tables get `created_at` / `updated_at`
(`DATETIME(3)` with `DEFAULT CURRENT_TIMESTAMP(3)` / `ON UPDATE`). Soft deletes only where noted —
moderation prefers reversible `status` flips over row deletion.

### 3.1 Identity & auth

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `username` | VARCHAR(30) NOT NULL | **UNIQUE**. Stored *without* the `u/` prefix (UI renders `u/{username}`). Charset-restricted `[a-z0-9_]{3,30}`, lowercased — this keeps the frontend's `@mention` regex (`@[A-Za-z0-9_]+`) working. |
| `email` | VARCHAR(255) NOT NULL | **UNIQUE** (stored lowercased) |
| `mobile` | VARCHAR(20) NULL | E.164-ish, collected at signup (client requirement: "Email id/Contact number") |
| `password_hash` | VARCHAR(100) NOT NULL | bcrypt, cost 12 |
| `avatar_id` | BIGINT UNSIGNED NULL | FK → `avatars.id`. NULL until the quiz is completed |
| `spidey_code` | CHAR(10) NULL | **UNIQUE**. e.g. `BND-7K2M9Q` — shown on the Avatar Card |
| `tagline` | VARCHAR(160) NULL | Personalised tagline (defaults to avatar tagline, admin-overridable) |
| `state` | VARCHAR(100) NULL | Avatar Card field |
| `country` | VARCHAR(100) NULL | Avatar Card field |
| `status` | ENUM('active','disabled') NOT NULL DEFAULT 'active' | `disabled` = admin kill-switch |
| `token_version` | INT UNSIGNED NOT NULL DEFAULT 0 | bumped on password change / disable → instantly invalidates all issued JWTs |
| `email_verified_at` | DATETIME(3) NULL | reserved for the promised email-verification step |
| `last_login_at` | DATETIME(3) NULL | |
| `quiz_completed_at` | DATETIME(3) NULL | onboarding gate marker |

Indexes: `UNIQUE(username)`, `UNIQUE(email)`, `UNIQUE(spidey_code)`, `INDEX(status)`,
`INDEX(avatar_id)`, `INDEX(created_at)` (living-web counter, admin listing).

#### `password_reset_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users | INDEX |
| `token_hash` | CHAR(64) NOT NULL | SHA-256 of the raw token — raw token is never stored |
| `expires_at` | DATETIME(3) NOT NULL | +30 min |
| `used_at` | DATETIME(3) NULL | single-use |

No SMS/email service is in scope, so the reset flow is: request → token row created → in `dev` the
link is logged/returned; in production this is the seam where an email provider plugs in later.

#### `rate_limits`
| Column | Type | Notes |
|---|---|---|
| `bucket` | VARCHAR(120) PK part | e.g. `login:1.2.3.4`, `signup:1.2.3.4`, `post:42` |
| `window_start` | DATETIME(3) PK part | fixed-window |
| `count` | INT UNSIGNED | `INSERT … ON DUPLICATE KEY UPDATE count = count + 1` |

DB-backed fixed-window limiter (no Redis dependency for a microsite); swap for Redis if traffic
demands. Cleaned opportunistically (`DELETE WHERE window_start < NOW() - INTERVAL 1 DAY`).

### 3.2 Avatar experience (admin-managed content)

#### `avatars`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `slug` | VARCHAR(40) UNIQUE | `protector`, `fighter`, … |
| `name` | VARCHAR(60) | "The Protector" |
| `emoji` | VARCHAR(16) | 🛡️ |
| `tagline` | VARCHAR(200) | one-liner for the Avatar Card |
| `description` | TEXT | full description copy |
| `badge_asset` | VARCHAR(255) NULL | path to artwork once client assets arrive |
| `color` | CHAR(7) NULL | hex accent for the card |
| `sort_order` | INT | deterministic final tie-break (see §6.3) |
| `is_active` | TINYINT(1) DEFAULT 1 | |

Seeded with **11 rows**: the 10 described identities **plus 🧩 The Problem Solver**, which the
client's mapping table references but their descriptions list omits (they describe 🕷️ The Survivor
instead, which the mapping never awards). Both are seeded; the admin mapping editor resolves the
conflict — see §16.

#### `quiz_questions`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `position` | INT NOT NULL | display order 1–4 |
| `text` | VARCHAR(255) NOT NULL | |
| `is_tiebreaker` | TINYINT(1) DEFAULT 0 | exactly one row = 1 (the "Brand New Day" question) |
| `is_active` | TINYINT(1) DEFAULT 1 | |

#### `quiz_options`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `question_id` | FK → quiz_questions | INDEX, ON DELETE CASCADE |
| `position` | INT | display order |
| `text` | VARCHAR(255) | |
| `primary_avatar_id` | FK → avatars | 2 points by default |
| `secondary_avatar_id` | FK → avatars | 1 point by default |
| `primary_points` | TINYINT UNSIGNED DEFAULT 2 | admin-tunable weights |
| `secondary_points` | TINYINT UNSIGNED DEFAULT 1 | |
| `is_active` | TINYINT(1) DEFAULT 1 | |

**This table *is* the avatar-assignment mapping** the admin panel edits. Changing a row changes the
scoring for all future quiz takers (past results are snapshotted, below).

#### `quiz_submissions`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users, **UNIQUE** | one submission per user (retake = UPDATE, keeps history in JSON) |
| `answers` | JSON NOT NULL | `[{questionId, optionId}]` snapshot |
| `scores` | JSON NOT NULL | `{ "<avatarId>": points, … }` snapshot for explainability |
| `assigned_avatar_id` | FK → avatars | outcome |
| `tie_broken` | TINYINT(1) DEFAULT 0 | audit: was the BND tie-breaker used |

Snapshotting answers + scores means an admin can later change the mapping without corrupting the
audit trail of *why* a user got their avatar.

### 3.3 Forum

#### `communities`
Seeded from the frontend's five (`w/Protectors` #ffd23f, `w/Dreamers` #ff5a6a, `w/Rebels` #4d8bff,
`w/SpideySpotted` #ff9f43, `w/Prodigies` #7ee787). The current forum UI removed the community
filter per client feedback, but the data model keeps it (home-page feed still shows community
pills; the field exists in every mock thread).

| Column | Type |
|---|---|
| `id` | PK |
| `slug` | VARCHAR(40) UNIQUE (`protectors`) |
| `handle` | VARCHAR(50) (`w/Protectors`) |
| `color` | CHAR(7) |
| `is_active` | TINYINT(1) |

#### `flairs`
Post labels from the mock data: `Art`, `Sighting`, `Build`, `Story`, `Cosplay`. (`Trending`/`Hot`
in the mocks are *computed* badges, not stored flairs — see §7.4.)

| `id` PK | `label` VARCHAR(30) UNIQUE | `is_active` |

#### `posts`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users | INDEX |
| `community_id` | FK → communities NULL | optional |
| `flair_id` | FK → flairs NULL | optional |
| `title` | VARCHAR(300) NOT NULL | |
| `body` | TEXT NOT NULL | plain text; rendered escaped by React (XSS-safe by construction) |
| `is_spoiler` | TINYINT(1) NOT NULL DEFAULT 0 | the create-modal checkbox — **collected by the UI today but never persisted; this column completes the feature** |
| `score` | INT NOT NULL DEFAULT 0 | denormalized net votes (up − down) |
| `comment_count` | INT UNSIGNED NOT NULL DEFAULT 0 | denormalized, includes replies |
| `hot_score` | DOUBLE NOT NULL DEFAULT 0 | Reddit-style ranking, recomputed on vote (§13.3) |
| `status` | ENUM('active','hidden','deleted') DEFAULT 'active' | `hidden` = admin moderation (reversible); `deleted` = author soft-delete |
| `moderated_by` | FK → admin_users NULL | who hid it |
| `moderated_at` | DATETIME(3) NULL | |
| `moderation_reason` | VARCHAR(255) NULL | |

Indexes: `(status, id DESC)` for **New** keyset paging, `(status, score DESC, id DESC)` for
**Top**, `(status, hot_score DESC, id DESC)` for **Hot/Trending** (home feed), `(user_id, id)`,
`(community_id, id)`.

#### `post_media`
| `id` PK | `post_id` FK INDEX | `media_id` FK → media | `position` INT |

One-to-many so multi-image posts don't need a schema change (Phase-1 UI shows one `ImageSlot`).

#### `comments`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `post_id` | FK → posts | |
| `user_id` | FK → users | |
| `parent_comment_id` | FK → comments NULL | NULL = top-level comment |
| `root_comment_id` | FK → comments NULL | NULL = top-level; **replies always point at the root** |
| `reply_to_user_id` | FK → users NULL | who was @mentioned/replied to (drives notification + prefill) |
| `body` | TEXT NOT NULL | |
| `score` | INT NOT NULL DEFAULT 0 | denormalized |
| `status` | ENUM('active','hidden','deleted') DEFAULT 'active' | same moderation semantics as posts |
| `moderated_by` / `moderated_at` / `moderation_reason` | | as posts |

The UI is strictly **two-level** (replying to a reply attaches to the root comment — the reply box
is handed `rootId`, never the reply's id). The backend enforces this: on create, if the target
comment has a `root_comment_id`, the new reply inherits it instead of nesting deeper.
Indexes: `(post_id, root_comment_id, id)` (fetch tree in two ordered scans),
`(post_id, status)`, `(user_id, id)`.

#### `post_votes` / `comment_votes`
| Column | Type | Notes |
|---|---|---|
| `post_id`/`comment_id` + `user_id` | **composite PK** | one vote per user per item |
| `value` | TINYINT NOT NULL | `1` (up) or `-1` (down) |
| `created_at` / `updated_at` | | |

Toggle semantics (exactly what the UI does): vote same direction again → **DELETE** row; vote
opposite → **UPDATE** value; new → **INSERT**. Each mutation adjusts the parent's `score` by the
delta inside one transaction (§13.2). Reverse index `(user_id)` for "my votes" hydration.

### 3.4 MJ Wall

#### `mj_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users NOT NULL | posting requires login (composer today is anonymous — see §16) |
| `body` | VARCHAR(500) NOT NULL | composer has no limit today; 500 is the enforced cap |
| `status` | ENUM('pending','approved','rejected','hidden') DEFAULT 'pending' | `hidden` = disabled after approval |
| `reviewed_by` | FK → admin_users NULL | |
| `reviewed_at` | DATETIME(3) NULL | |
| `rejection_reason` | VARCHAR(255) NULL | surfaced to the author via notification |
| `is_featured` | TINYINT(1) DEFAULT 0 | optional curation for the home-page wall |

Indexes: `(status, id DESC)` — the review queue *and* the public gallery are both this index.

### 3.5 Fan art

#### `media`
Generic upload registry (used by fan art now, post images next).

| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users | uploader |
| `kind` | ENUM('image') | video later |
| `file_path` | VARCHAR(255) | stored under `uploads/` (outside `public/` so pending art isn't guessable); served via `/api/media/[id]` which checks approval status |
| `mime_type` | VARCHAR(100) | validated by magic bytes, not extension |
| `size_bytes` | INT UNSIGNED | cap 5 MB |
| `width` / `height` | INT NULL | |

#### `fan_art`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users | |
| `media_id` | FK → media | |
| `title` | VARCHAR(200) | |
| `description` | VARCHAR(500) NULL | |
| `status` | ENUM('pending','approved','rejected','hidden') DEFAULT 'pending' | same lifecycle as MJ Wall |
| `reviewed_by` / `reviewed_at` / `rejection_reason` | | |

Indexes: `(status, id DESC)`.

### 3.6 Notifications

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `user_id` | FK → users | **recipient**, INDEX `(user_id, read_at, id DESC)` |
| `actor_user_id` | FK → users NULL | who did it (NULL for system/admin events) |
| `type` | ENUM('reply','post_comment','mention','mj_approved','mj_rejected','fanart_approved','fanart_rejected','system') | `reply` + `post_comment` match the existing UI kinds 1:1 |
| `post_id` | FK NULL | deep-link target `/forum/{post_id}` |
| `comment_id` | FK NULL | |
| `entity_type` / `entity_id` | VARCHAR(20) / BIGINT NULL | for mj/fanart events |
| `snippet` | VARCHAR(180) | one-line preview (UI ellipsizes) |
| `read_at` | DATETIME(3) NULL | NULL = unread (drives the red badge count) |

**Never created for votes** (explicit rule in `ForumProvider.jsx`). "Opened or not" =`read_at`;
the UI's mark-all-on-bell-open maps to one `UPDATE … SET read_at = NOW(3) WHERE user_id = ? AND
read_at IS NULL`. Self-actions never notify (`actor_user_id ≠ user_id` enforced at write).

### 3.7 Admin & RBAC

#### `admin_roles`
| `id` PK | `slug` UNIQUE (`super_admin`, `moderator`, `content_manager`) | `name` | `description` |

#### `admin_permissions`
| `id` PK | `slug` UNIQUE | `description` |

Seeded permission slugs:
`dashboard.view`, `users.view`, `users.manage`, `forum.moderate`, `mj.review`, `fanart.review`,
`quiz.manage`, `avatars.manage`, `admins.manage`, `audit.view`.

#### `admin_role_permissions`
| `role_id` + `permission_id` composite PK |

Seeded matrix:

| Permission | super_admin | moderator | content_manager |
|---|:-:|:-:|:-:|
| dashboard.view | ✅ | ✅ | ✅ |
| users.view | ✅ | ✅ | — |
| users.manage (disable/enable) | ✅ | ✅ | — |
| forum.moderate (hide posts/comments) | ✅ | ✅ | — |
| mj.review | ✅ | ✅ | ✅ |
| fanart.review | ✅ | ✅ | ✅ |
| quiz.manage (questions/options/mapping) | ✅ | — | ✅ |
| avatars.manage | ✅ | — | ✅ |
| admins.manage | ✅ | — | — |
| audit.view | ✅ | ✅ | — |

#### `admin_users`
| Column | Type | Notes |
|---|---|---|
| `id` | PK | |
| `name` | VARCHAR(100) | |
| `email` | VARCHAR(255) UNIQUE | login identifier |
| `password_hash` | VARCHAR(100) | bcrypt cost 12 |
| `role_id` | FK → admin_roles | |
| `status` | ENUM('active','disabled') | disabled admins can't log in; sessions die via `token_version` |
| `token_version` | INT UNSIGNED DEFAULT 0 | |
| `last_login_at` | DATETIME(3) NULL | |

#### `admin_audit_logs`
Every admin mutation writes one row — approvals, rejections, hides, disables, mapping edits.

| `id` PK | `admin_user_id` FK | `action` VARCHAR(60) (`mj.approve`, `user.disable`, `quiz.option.update`, …) | `entity_type` VARCHAR(30) | `entity_id` BIGINT | `meta` JSON (before/after, reason) | `created_at` |

Index `(admin_user_id, id DESC)`, `(entity_type, entity_id)`.

#### `schema_migrations`
| `id` PK | `filename` VARCHAR(255) UNIQUE | `applied_at` |

---

## 4. Entity relations

```
users 1──* posts 1──* comments            users 1──1 quiz_submissions *──1 avatars
users 1──* post_votes *──1 posts          quiz_questions 1──* quiz_options *──1 avatars (primary)
users 1──* comment_votes *──1 comments    quiz_options *──1 avatars (secondary)
users 1──* mj_messages                    users *──1 avatars (assigned identity)
users 1──* fan_art *──1 media             communities 1──* posts *──1 flairs
users 1──* notifications (recipient)      posts 1──* post_media *──1 media
comments *──1 comments (parent/root, self-referential, max depth 2)

admin_roles 1──* admin_users 1──* admin_audit_logs
admin_roles *──* admin_permissions (via admin_role_permissions)
admin_users 1──* {mj_messages, fan_art, posts, comments}.reviewed_by/moderated_by
```

FK policy: `ON DELETE CASCADE` only for pure child rows (votes, quiz options, role-permissions,
post_media). User deletion is **not** cascaded — users are disabled, never hard-deleted, so
content attribution survives. `RESTRICT` everywhere else.

---

## 5. Auth & security

### 5.1 Passwords
- **bcrypt (bcryptjs), cost 12** — stored in `password_hash`; never logged, never returned in DTOs.
- Policy enforced server-side: ≥ 8 chars, at least one letter + one number (validated in
  `lib/server/validate.js`; mirror client-side later).
- On password change/reset: hash update **and** `token_version + 1` → every outstanding JWT dies.

### 5.2 JWT sessions (portal users)
- `jose` `SignJWT`, HS256, secret `JWT_SECRET` (≥ 32 random bytes).
- Payload (minimal by design): `{ sub: userId, un: username, tv: token_version }`, `iat`, `exp` 7d.
- Delivery: **httpOnly cookie `bnd_session`**, `Secure` (prod), `SameSite=Lax`, `Path=/`.
  httpOnly means no JS can read it → XSS can't exfiltrate sessions. SameSite=Lax +
  Origin/Host verification on mutating handlers covers CSRF.
- **Every authenticated request** runs the DAL: verify signature → `SELECT id, username, status,
  token_version, avatar_id, quiz_completed_at FROM users WHERE id = ?` → reject if
  `status != 'active'` or `tv` mismatch. One indexed PK read; this is what makes admin
  **disable instantaneous**, not eventual.

### 5.3 Admin sessions
Identical machinery, deliberately separate everything: cookie `bnd_admin_session`, secret
`ADMIN_JWT_SECRET`, payload `{ sub: adminId, role: slug, tv }`, exp **8 h** (workday), DAL loads
the role's permission set fresh from the DB on every request (`requirePermission(slug)` → 403).
A portal JWT can never be replayed against admin APIs (different secret *and* different cookie
name *and* different verification path).

### 5.4 Login / signup / forgot password flows
```
SIGNUP  POST /api/auth/signup { username, email, mobile, password }
        → validate (username regex, email, password policy)
        → rate limit (5/hour/IP)
        → uniqueness check (username, email) with clean 409 field errors
        → bcrypt.hash → INSERT users → issue JWT cookie → 201 { user }
        (client then routes into the avatar quiz — §6)

LOGIN   POST /api/auth/login { email, password }
        → rate limit (10/15min/IP+email)
        → SELECT by email; bcrypt.compare against real or dummy hash (constant-time-ish,
          no user-enumeration timing oracle); generic "invalid credentials" error
        → status check → issue JWT cookie → update last_login_at

LOGOUT  POST /api/auth/logout → clear cookie

FORGOT  POST /api/auth/forgot-password { email }
        → always 200 (no enumeration) → if user exists: token = 32 random bytes,
          store SHA-256, 30 min expiry → dev: log/return reset URL; prod: email-provider seam
RESET   POST /api/auth/reset-password { token, password }
        → hash token, match unexpired unused row → update hash, mark used,
          bump token_version → 200 (user logs in again)
```

### 5.5 Hardening checklist (enforced in code, verified in Phase 8)
- **SQL injection:** mysql2 prepared statements only; identifiers never interpolated; sort columns
  chosen from a whitelist map (`{new: 'p.id', top: 'p.score', hot: 'p.hot_score'}`).
- **XSS:** bodies stored as plain text; React escapes on render; the `@mention` renderer splits on
  a strict regex and never uses `dangerouslySetInnerHTML`.
- **IDOR:** every mutation re-checks ownership (`WHERE id = ? AND user_id = ?`) or permission.
- **Uploads:** magic-byte sniffing (`jpeg/png/webp/gif`), 5 MB cap, randomized filenames, stored
  outside `public/`, served through a status-checking handler with `Content-Disposition` safety.
- **Rate limits:** login, signup, forgot-password, post/comment/mj/fanart creation.
- **Secrets:** only read server-side (`lib/server/*`); nothing secret carries `NEXT_PUBLIC_`.
- **Admin panel:** `noindex`, no links from the public site, generic login errors, audit log on
  every mutation.
- **Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` via
  root layout/`next.config.mjs` headers.

---

## 6. Onboarding & the Avatar Experience

### 6.1 Flow
```
SWING IN / any join CTA
  → AuthModal (existing UI) → POST /api/auth/signup → session cookie set
  → Avatar quiz (new UI, 4 questions, one option each — GET /api/quiz)
  → POST /api/quiz/submit { answers: [{questionId, optionId}] }
      → server scores (§6.3), assigns avatar, generates spidey_code,
        stamps quiz_completed_at, stores snapshot in quiz_submissions
  → Avatar Card reveal: { avatar: {name, emoji, tagline, description, color, badge},
                          spideyCode, state?, country? }
  → optional PATCH /api/me { state, country } (card fields the client wants displayed)
  → user lands in the forum fully onboarded
```
Login for an existing user who never finished the quiz routes back into the quiz
(`quiz_completed_at IS NULL` is the gate; response DTO carries `needsQuiz: true`).

### 6.2 Quiz content (seeded, admin-editable)
Four questions from the client's final questionnaire, each with five options, each option mapping
to a primary avatar (2 pts) + secondary avatar (1 pt). Seeds implement the client's mapping table
verbatim (e.g. Q1 "Protect people first" → 🛡️ Protector primary, 🕸️ Connector secondary; the
"Brand New Day" question is flagged `is_tiebreaker`).

### 6.3 Scoring algorithm (server-side, pure function)
```
score = {}                                  # avatarId → points
for each answer:
    score[opt.primary_avatar_id]   += opt.primary_points    (default 2)
    score[opt.secondary_avatar_id] += opt.secondary_points  (default 1)

winner = max(score)
if tie:
    bnd = the answer to the is_tiebreaker question
    prefer, among the tied avatars: bnd.primary_avatar, then bnd.secondary_avatar
    if still tied: lowest avatars.sort_order          # deterministic, never random
```
Max total = 12 points across 4 answers; 625 combinations funnel into the identities exactly as the
client describes. The function lives in `lib/server/quiz.js` with unit-style fixture checks in the
phase acceptance criteria (e.g. all-Protector answers ⇒ Protector; crafted tie ⇒ BND breaks it).

### 6.4 Spidey code
`BND-` + 6 chars from an unambiguous base-32 alphabet (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), retried
on the (unlikely) unique-key collision. Generated once at quiz completion.

---

## 7. Forum

No approval gate — posts and comments are live immediately; admins moderate reactively (§11).

### 7.1 Posts
- Create: `POST /api/forum/posts { title, body, isSpoiler, communityId?, flairId? }` (auth +
  completed quiz required). The existing create-modal already collects title/body/spoiler —
  it finally gets wired to a real endpoint.
- Spoiler: `is_spoiler` returns in every DTO; list/detail UI blurs body (and image) behind a
  "Spoiler — tap to reveal" shield. The flag is also editable by admins (mark/unmark).
- Author soft-delete: `DELETE /api/forum/posts/:id` → `status='deleted'` (title/body replaced with
  tombstone in DTOs, comments remain).

### 7.2 Comments & replies
- `POST /api/forum/posts/:id/comments { body }` — top-level.
- `POST /api/forum/comments/:id/replies { body }` — server resolves the true root
  (`root_comment_id = target.root_comment_id ?? target.id`) so depth never exceeds 2, exactly
  matching the UI. `reply_to_user_id = target.user_id` powers the `@handle` prefill and the
  notification.
- `@mentions`: server parses `@[a-z0-9_]+` tokens, resolves to real users, writes `mention`
  notifications (capped at 3 per comment to prevent spam).
- New comments return with `score = 1` — the author's implicit self-upvote is a real
  `comment_votes` row (matches the UI's `votes: 1` on fresh comments, keeps math consistent).

### 7.3 Voting
`POST /api/forum/posts/:id/vote { direction: "up" | "down" | null }` (and the comment twin).
Server translates the UI's toggle semantics into insert/update/delete + score delta in one
transaction (§13.2). Response returns `{ score, myVote }` so the client reconciles — fixing the
Phase-1 bug where list-page and detail-page vote state disagreed.

### 7.4 Sorting & badges
- **New** = `ORDER BY p.id DESC` (id is time-ordered; matches the UI's `b.id - a.id`).
- **Top** = `ORDER BY p.score DESC, p.id DESC`.
- **Hot** (home-page "Trending" teaser + future tab) = precomputed `hot_score`
  `= log10(max(|score|,1)) * sign(score) + createdEpoch / 45000`, updated on every vote/creation —
  reads stay index-only, no per-request math (§13.3).
- The mock data's `tag: "Trending" / "Hot"` becomes a computed DTO badge (top-N by hot_score gets
  `Trending`, high vote-velocity gets `Hot`); `Art/Sighting/Build/Story/Cosplay` are stored flairs.

### 7.5 Pagination
Keyset (cursor) pagination everywhere — `LIMIT/OFFSET` degrades linearly and double-serves rows
when new posts land between pages; keyset is O(log n) and stable. Page size 6 initial, 3 per
"Load more" (matching the UI); cursor format in §13.1.

### 7.6 Share
Stays client-side (Web Share API / clipboard, already built). Backend contribution: canonical
`/forum/[id]` URLs resolve server-side and (Phase 7) `generateMetadata` adds OG tags so shared
links unfurl with the post title.

---

## 8. Notifications

In-app only (no SMS/email — per requirements the UI is the delivery channel).

**Producers** (all written in the same transaction as their trigger):
| Event | Recipient | Type |
|---|---|---|
| Comment on your post | post author | `post_comment` |
| Reply under your comment | root-comment author (and `reply_to_user` if different) | `reply` |
| @mention | mentioned user | `mention` |
| MJ message approved / rejected | author | `mj_approved` / `mj_rejected` |
| Fan art approved / rejected | author | `fanart_approved` / `fanart_rejected` |
| Votes | — | **never** (explicit product rule) |

Self-notifications are suppressed (`actor == recipient` → skip).

**Consumers:**
- `GET /api/me/notifications?cursor=` → newest-first keyset page + `unreadCount`.
- `POST /api/me/notifications/read-all` → the bell-open behavior (single UPDATE).
- Badge = `COUNT(*) WHERE user_id = ? AND read_at IS NULL` (covered by the
  `(user_id, read_at, id)` index).
- Polling: the header re-fetches `unreadCount` every 30 s (visibility-gated). No websockets for a
  microsite; the seam to upgrade later is isolated in the provider.

DTO matches the existing `ForumProvider` shape: `{ id, kind, who, snippet, href, time, read }` —
`href` is derived server-side (`/forum/{post_id}`), `time` is the raw timestamp (client renders
relative "2m/3h/1d" strings).

---

## 9. MJ Wall

1. **Submit** (auth required): `POST /api/mj-wall/messages { body }` → `status='pending'` →
   the composer's existing "Sent! Your memory is now part of the wall." state (copy tweak:
   "…will appear once approved").
2. **Review** (admin, `mj.review`): queue at `/admin/mj-wall` — approve / reject (with optional
   reason) / hide-after-approval. Every decision writes `reviewed_by/at` + audit log + a
   notification to the author.
3. **Display**: `GET /api/mj-wall/messages?cursor=` returns **approved only**, newest-first
   keyset; powers the `/mj-wall` gallery page (currently a ComingSoon shell) and
   `?featured=1` powers the home-page wall section.
4. **Mine**: `GET /api/me/mj-messages` shows the author their own statuses.

---

## 10. Fan art

Mirror of the MJ Wall lifecycle with an upload step:

1. `POST /api/fan-art` — multipart (`title`, `description?`, `image`): validate magic bytes +
   size → store under `uploads/fan-art/` with a random name → `media` row + `fan_art` row
   (`pending`).
2. Admin review at `/admin/fan-art` (permission `fanart.review`) with inline image preview —
   approve / reject / hide. Notification + audit log on decision.
3. Public gallery `GET /api/fan-art?cursor=` (approved only). Pending/rejected images are **not
   reachable**: files live outside `public/` and `/api/media/[id]` only streams media whose parent
   fan-art row is `approved` (or to its owner / an admin).
4. Forum `ImageSlot` placeholders become real once `post_media` upload lands (Phase 6 stretch).

---

## 11. Admin panel & RBAC

**Stack:** `/admin` route group inside this Next app; shadcn/ui on Tailwind v4, dark theme matching
the microsite's palette (red `#ff3a4a` accent on near-black). Admin CSS is imported only by the
admin layout — the cinematic microsite's hand-tuned styles are untouched.

**Isolation guarantees** (client requirement: "no other can login through that… not get mixed with
portal user login"):
- Separate table (`admin_users`) — a fan account cannot exist in the admin realm at all.
- Separate cookie + secret + expiry (§5.3); portal tokens are cryptographically useless on
  `/api/admin/*`.
- `proxy.js` redirects unauthenticated `/admin/**` traffic to `/admin/login` before anything
  renders; the admin layout re-verifies server-side; every `/api/admin/*` handler re-verifies +
  permission-checks (defense in depth — the proxy is UX, the DAL is the boundary).
- `/admin` pages send `noindex` metadata.

**Sections** (sidebar; items hidden without the matching permission):

| Route | Permission | Contents |
|---|---|---|
| `/admin` | dashboard.view | KPI cards (users, posts, pending MJ / fan art), latest signups, pending queues shortcuts |
| `/admin/mj-wall` | mj.review | Tabs pending/approved/rejected/hidden · approve/reject(+reason)/hide/feature · bulk approve |
| `/admin/fan-art` | fanart.review | Same lifecycle + image preview dialog |
| `/admin/users` | users.view/manage | Search + paginated table · disable/enable (with confirm) · detail drawer: avatar, quiz answers, content counts |
| `/admin/forum` | forum.moderate | Posts & comments tabs · search · hide/unhide (+reason) · spoiler flag toggle |
| `/admin/quiz` | quiz.manage | Questions & options CRUD · per-option **avatar mapping editor** (primary/secondary avatar dropdowns + point weights) · tie-breaker designation |
| `/admin/avatars` | avatars.manage | Avatar CRUD: name, emoji, tagline, description, color, active · shows live "how many users hold this identity" |
| `/admin/admins` | admins.manage | Admin accounts CRUD · role assignment · disable |
| `/admin/audit` | audit.view | Filterable audit-log table |

**Moderation model** — "admin can control all user activity": disabling is always a reversible
status flip, never data loss:
- User → `users.status='disabled'` (+ `token_version++` → live sessions die on next request).
- Post/comment → `status='hidden'` (vanishes from all public queries; restorable).
- MJ message / fan art → `status='rejected'` pre-approval or `'hidden'` post-approval.
- Every action: audit log row with actor, entity, reason, before/after.

---

## 12. Full API surface

Public = no auth · User = `bnd_session` required · Admin = `bnd_admin_session` + permission.

### Auth
| Method & path | Auth | Purpose |
|---|---|---|
| POST `/api/auth/signup` | public | create account, set cookie |
| POST `/api/auth/login` | public | password login, set cookie |
| POST `/api/auth/logout` | user | clear cookie |
| POST `/api/auth/forgot-password` | public | issue reset token |
| POST `/api/auth/reset-password` | public | consume token, set new password |

### Me / onboarding
| GET `/api/me` | user | profile + avatar + `needsQuiz` |
| PATCH `/api/me` | user | state, country, tagline |
| GET `/api/quiz` | user | active questions + options (no mapping leak — avatar ids stripped) |
| POST `/api/quiz/submit` | user | score → assign avatar → return Avatar Card payload |
| GET `/api/me/notifications` · POST `/api/me/notifications/read-all` | user | §8 |
| GET `/api/me/mj-messages` · GET `/api/me/fan-art` | user | own submissions + statuses |

### Forum
| GET `/api/forum/posts?sort=new|top|hot&cursor=&limit=` | public | list (viewer's `myVote` hydrated when authed) |
| POST `/api/forum/posts` | user | create (spoiler flag included) |
| GET `/api/forum/posts/:id` | public | detail |
| DELETE `/api/forum/posts/:id` | user (owner) | soft delete |
| POST `/api/forum/posts/:id/vote` | user | `{direction: up|down|null}` toggle |
| GET `/api/forum/posts/:id/comments` | public | two-level tree |
| POST `/api/forum/posts/:id/comments` | user | top-level comment |
| POST `/api/forum/comments/:id/replies` | user | reply (root-normalized) |
| POST `/api/forum/comments/:id/vote` | user | toggle |
| DELETE `/api/forum/comments/:id` | user (owner) | soft delete |
| GET `/api/forum/communities` · `/api/forum/flairs` | public | taxonomy for composer/home feed |

### MJ Wall & fan art
| GET `/api/mj-wall/messages?cursor=&featured=` | public | approved gallery |
| POST `/api/mj-wall/messages` | user | submit (→ pending) |
| GET `/api/fan-art?cursor=` | public | approved gallery |
| POST `/api/fan-art` | user | multipart upload (→ pending) |
| GET `/api/media/:id` | mixed | streams file iff approved / owner / admin |

### Stats
| GET `/api/stats` | public | living-web numbers: total members, per-identity counts, country count |

### Admin (`/api/admin/**` — every handler: verify + permission + audit on mutation)
| POST `/api/admin/auth/login` · `/logout` · GET `/api/admin/auth/me` | — | admin session |
| GET `/api/admin/dashboard` | dashboard.view | KPIs + queue counts |
| GET `/api/admin/mj-messages?status=` · PATCH `/api/admin/mj-messages/:id` `{action: approve|reject|hide|unhide|feature, reason?}` | mj.review | queue + decisions |
| GET `/api/admin/fan-art?status=` · PATCH `/api/admin/fan-art/:id` | fanart.review | queue + decisions |
| GET `/api/admin/users?q=&status=&cursor=` · GET `/api/admin/users/:id` · PATCH `/api/admin/users/:id` `{action: disable|enable}` | users.* | user management |
| GET `/api/admin/posts?q=&status=` · PATCH `/api/admin/posts/:id` `{action: hide|unhide|spoiler|unspoiler, reason?}` | forum.moderate | post moderation |
| GET `/api/admin/comments?q=&status=` · PATCH `/api/admin/comments/:id` `{action: hide|unhide}` | forum.moderate | comment moderation |
| GET/POST `/api/admin/quiz/questions` · PATCH/DELETE `/api/admin/quiz/questions/:id` | quiz.manage | question CRUD + tiebreaker flag |
| POST `/api/admin/quiz/questions/:id/options` · PATCH/DELETE `/api/admin/quiz/options/:id` | quiz.manage | option CRUD **incl. primary/secondary avatar + points → the mapping editor** |
| GET `/api/admin/avatars` · POST · PATCH `/api/admin/avatars/:id` | avatars.manage | avatar CRUD |
| GET `/api/admin/admins` · POST · PATCH `/api/admin/admins/:id` | admins.manage | admin + role management |
| GET `/api/admin/audit?entity=&admin=&cursor=` | audit.view | audit trail |

---

## 13. Query patterns, pagination & performance

### 13.1 Keyset pagination (the standard list query)
Cursor = opaque base64 of the last row's sort keys. Examples:

**New** (`cursor = {id}`):
```sql
SELECT p.id, p.title, p.body, p.is_spoiler, p.score, p.comment_count, p.created_at,
       u.username, u.avatar_id, c.handle AS community, f.label AS flair,
       pv.value AS my_vote
FROM posts p
JOIN users u          ON u.id = p.user_id
LEFT JOIN communities c ON c.id = p.community_id
LEFT JOIN flairs f      ON f.id = p.flair_id
LEFT JOIN post_votes pv ON pv.post_id = p.id AND pv.user_id = ?   -- NULL when logged out
WHERE p.status = 'active' AND p.id < ?          -- cursor
ORDER BY p.id DESC
LIMIT ?;                                        -- limit+1 → hasMore without COUNT(*)
```

**Top** (`cursor = {score, id}` — tuple comparison keeps it stable among equal scores):
```sql
WHERE p.status = 'active' AND (p.score < ? OR (p.score = ? AND p.id < ?))
ORDER BY p.score DESC, p.id DESC
LIMIT ?;
```
Both are pure index walks on `(status, id)` / `(status, score, id)`. We always fetch `limit + 1`
rows: the extra row's existence *is* `hasMore` — no `COUNT(*)` ever runs on hot paths.

**Comment tree** — two ordered scans, no recursion:
```sql
SELECT ... FROM comments WHERE post_id=? AND root_comment_id IS NULL AND status='active'
ORDER BY id DESC;                                -- roots, newest first (matches UI prepend)
SELECT ... FROM comments WHERE post_id=? AND root_comment_id IN (?,...) AND status='active'
ORDER BY id ASC;                                 -- replies, oldest first (matches UI append)
```
Assembled into `{...root, replies: []}` in JS. Posts cap comment pages at 200 roots per fetch
(cursor beyond that), replies inlined (2-level cap keeps them bounded).

### 13.2 Vote transaction (toggle semantics, counter integrity)
```sql
START TRANSACTION;
SELECT value FROM post_votes WHERE post_id=? AND user_id=? FOR UPDATE;
-- app logic: none→insert(delta=v) | same→delete(delta=-v) | opposite→update(delta=2v)
INSERT/UPDATE/DELETE post_votes ...;
UPDATE posts SET score = score + ?, hot_score = ? WHERE id = ?;
COMMIT;
```
`FOR UPDATE` serializes double-clicks; the denormalized `score` therefore never drifts. A nightly
reconciliation query (`scripts/` later) can assert `score == SUM(votes)` as a safety net.

### 13.3 Hot score
`hot = sign(score) * log10(max(|score|, 1)) + epochSeconds(created_at) / 45000`
Computed in JS at insert/vote time and stored — reads are index-only. 45 000 s ≈ Reddit's decay:
a new post outranks a 10×-upvoted post that is ~12.5 h older.

### 13.4 Denormalized counters
`posts.score`, `posts.comment_count`, `comments.score` are updated in the same transaction as
their source-of-truth rows. Rationale: forum lists are read ~100× more than written; sorting by
`SUM()` subqueries can't use indexes. `mj/fanart` queues are small → live `COUNT(*)` is fine there.

### 13.5 Connection pooling
One `mysql2/promise` pool per server process (`connectionLimit` from env, default 10), cached on
`globalThis` so Next dev hot-reload doesn't leak pools. Timezone pinned to UTC (`timezone: 'Z'`);
`DATETIME(3)` everywhere; the API serializes ISO-8601 and the client renders relative times.

---

## 14. Environment & configuration

`.env.local` (gitignored) / `.env.example` (committed):

```bash
# ── MySQL ─────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=spiderman_bnd
DB_CONNECTION_LIMIT=10

# ── Auth ──────────────────────────────────────────
JWT_SECRET=            # openssl rand -base64 48
JWT_EXPIRES_IN=7d
ADMIN_JWT_SECRET=      # different value! openssl rand -base64 48
ADMIN_JWT_EXPIRES_IN=8h
BCRYPT_COST=12

# ── Bootstrap super admin (consumed by scripts/seed-admin.js) ──
ADMIN_SEED_NAME="Site Admin"
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=   # required, no default — choose a strong one

# ── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPLOAD_DIR=uploads
```

Next 16 env rules honored: non-prefixed vars are server-only; `scripts/*.js` load env via
`@next/env`'s `loadEnvConfig()` so CLI and runtime read identical config.

**Setup commands** (wired in `package.json`):
```bash
npm run db:migrate     # applies migrations/*.sql in order (tracked in schema_migrations)
npm run db:seed-admin  # upserts the super admin from ADMIN_SEED_* vars
npm run db:setup       # both, in order — a fresh DB is fully ready after this
```
The runner creates the database if it doesn't exist, so a brand-new machine needs only MySQL
running + `.env.local` filled in.

---

## 15. Build phases & milestones

Each phase is independently shippable with explicit acceptance criteria.

### Phase 0 — Foundations *(built alongside this document)*
- [ ] `.env.example` / `.env.local`, `lib/server/db.js` pool, migration runner, full schema
      migration, seed migrations (RBAC matrix, 11 avatars, 4 questions × 5 options with the
      client's exact mapping, communities, flairs), `seed-admin.js`.
- ✅ Accept: `npm run db:setup` on a clean MySQL creates everything; re-running is a no-op;
  `SELECT` spot-checks show the seeded mapping.

### Phase 1 — Portal auth
- [ ] signup/login/logout/forgot/reset handlers + DAL + rate limiting; wire `AuthModal` (loading,
      field errors, session context in nav).
- ✅ Accept: dupe-username 409 surfaces in the modal; JWT cookie httpOnly; disabled user's session
  dies mid-flight; reset token single-use.

### Phase 2 — Avatar experience
- [ ] Quiz UI (4 steps, in-theme), `/api/quiz` + `/submit`, scoring + tie-breaker + spidey code,
      Avatar Card reveal, state/country capture.
- ✅ Accept: fixture answer sets produce the client's expected identities incl. a forced tie broken
  by the BND question; retake updates; card shows title+badge, code, tagline, state, country.

### Phase 3 — Forum on real data
- [ ] Posts/comments/replies/votes/spoiler endpoints; swap `forumData.js` mocks for API calls;
      keyset pagination behind the existing "Load more"; spoiler blur treatment; share OG tags.
- ✅ Accept: two browsers see each other's posts/votes live; toggle vote math correct under
  double-click; list & detail vote state consistent; New/Top orders match SQL.

### Phase 4 — Notifications
- [ ] Producers in comment/reply/mention transactions; `GET` + `read-all`; ForumProvider switches
      from simulation to polling.
- ✅ Accept: reply → recipient badge within one poll; bell-open zeroes badge; votes never notify;
  self-actions never notify.

### Phase 5 — MJ Wall
- [ ] Submit endpoint (composer wired), approved-only gallery replacing the ComingSoon page,
      featured selection on home wall, author status view + decision notifications.
- ✅ Accept: pending message invisible publicly; approve → appears + notifies; reject shows reason
  to author only.

### Phase 6 — Fan art
- [ ] Upload pipeline (validation, private storage, media streamer), gallery, my-submissions.
      Stretch: `post_media` on forum posts (the `ImageSlot` placeholders).
- ✅ Accept: 6 MB file rejected; fake-extension file rejected; pending image URL 404s publicly but
  renders for owner/admin; approval flips visibility.

### Phase 7 — Admin panel *(started alongside this document)*
- [ ] shadcn/ui shell + `/admin/login`, proxy guard, RBAC enforcement per §11 table, all queues +
      moderation + quiz/avatar mapping editors + admin management + audit log.
- ✅ Accept: portal cookie useless on `/api/admin/*`; content_manager sees no Users nav and gets
  403 on `users.manage` API; every mutation lands in `admin_audit_logs`; disable-user kills a live
  session on its next request.

### Phase 8 — Hardening & launch
- [ ] Rate limits verified, security checklist (§5.5) audit, counter-reconciliation script,
      `EXPLAIN` on hot queries, dashboards/backup notes, deployment guide (Node server, `next
      build`, MySQL backups).
- ✅ Accept: checklist signed off; hot queries all index-backed; restore-from-backup rehearsed.

---

## 16. Open questions for the client

1. **Problem Solver vs. Survivor** — the mapping table awards 🧩 The Problem Solver (3 options)
   but the descriptions document 🕷️ The Survivor (which no option awards). Both are seeded and the
   admin mapping editor can retarget options; confirm which identity should exist (or map
   Problem-Solver slots to Survivor).
2. **MJ Wall author display** — gallery cards can show username / spidey identity / city, or stay
   anonymous. Schema stores the author either way; display choice is a DTO flag.
3. **MJ Wall & fan art login gate** — currently designed as login-required (spam control +
   notifications). The Phase-1 composer worked anonymously; confirm login-first is acceptable.
4. **Forum communities** — the forum UI dropped community pills per feedback, but data + home page
   still use them. Posts currently accept an optional community; confirm whether the composer
   should expose it.
5. **Email delivery** — forgot-password and the promised "email verification" need a provider
   eventually (Resend/SES/etc.). Flows are built with the seam; tokens log to server console in
   dev. OK for launch?
6. **Avatar artwork** — `avatars.badge_asset` awaits final art from the drive folders; emoji +
   color render until then.
