-- 005: media supports videos + records which storage driver holds the file
-- (local disk vs S3 — switchable via env without breaking old rows), and
-- mobile numbers become unique like email/username.

ALTER TABLE media
  MODIFY COLUMN kind ENUM('image','video') NOT NULL DEFAULT 'image',
  ADD COLUMN storage VARCHAR(10) NOT NULL DEFAULT 'local' AFTER kind;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_mobile (mobile);
