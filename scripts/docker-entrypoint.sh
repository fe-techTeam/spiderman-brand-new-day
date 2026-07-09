#!/bin/sh
# Container entrypoint: apply outstanding DB migrations, then hand off to the
# Next standalone server. See scripts/migrate.js for the idempotency + locking
# model (schema_migrations tracking + a MySQL advisory lock), which makes this
# safe to run on every boot and when several tasks start at once.
#
# `set -e` means a failed migration aborts boot with a non-zero exit, so a bad
# deploy fails safe (ECS keeps the old, healthy tasks) instead of serving a
# half-migrated schema. `exec` replaces this shell with node so node becomes
# PID 1 and still receives SIGTERM for graceful shutdown / request draining.
set -e
node scripts/migrate.js
# Best-effort bootstrap admin: idempotent (skips if already present, never resets
# a rotated password or bumps token_version) and must NOT block boot — the app
# runs fine without it. Configure ADMIN_SEED_* in the task def to enable it.
node scripts/seed-admin.js || echo "seed-admin skipped (see log above) — continuing boot"
exec node server.js
