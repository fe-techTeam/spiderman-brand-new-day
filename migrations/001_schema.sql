-- 001_schema.sql — full Phase-2 schema. See BACKEND.md §3.
-- MySQL 8, InnoDB, utf8mb4. Applied once by scripts/migrate.js.

-- ───────────────────────── Avatar experience (referenced by users) ─────────────────────────

CREATE TABLE avatars (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,
  name VARCHAR(60) NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '',
  tagline VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT NULL,
  badge_asset VARCHAR(255) NULL,
  color CHAR(7) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_avatars_slug (slug)
) ENGINE=InnoDB;

-- ───────────────────────── Identity & auth ─────────────────────────

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NULL,
  password_hash VARCHAR(100) NOT NULL,
  avatar_id BIGINT UNSIGNED NULL,
  spidey_code CHAR(10) NULL,
  tagline VARCHAR(160) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  email_verified_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  quiz_completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_spidey_code (spidey_code),
  KEY idx_users_status (status),
  KEY idx_users_avatar (avatar_id),
  KEY idx_users_created (created_at),
  CONSTRAINT fk_users_avatar FOREIGN KEY (avatar_id) REFERENCES avatars(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_prt_user (user_id),
  KEY idx_prt_token (token_hash),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE rate_limits (
  bucket VARCHAR(120) NOT NULL,
  window_start DATETIME(3) NOT NULL,
  count INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
) ENGINE=InnoDB;

-- ───────────────────────── Quiz content (admin-managed CMS) ─────────────────────────

CREATE TABLE quiz_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  position INT NOT NULL DEFAULT 0,
  text VARCHAR(255) NOT NULL,
  is_tiebreaker TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE quiz_options (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id BIGINT UNSIGNED NOT NULL,
  position INT NOT NULL DEFAULT 0,
  text VARCHAR(255) NOT NULL,
  primary_avatar_id BIGINT UNSIGNED NOT NULL,
  secondary_avatar_id BIGINT UNSIGNED NOT NULL,
  primary_points TINYINT UNSIGNED NOT NULL DEFAULT 2,
  secondary_points TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_qo_question (question_id),
  CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_qo_primary FOREIGN KEY (primary_avatar_id) REFERENCES avatars(id),
  CONSTRAINT fk_qo_secondary FOREIGN KEY (secondary_avatar_id) REFERENCES avatars(id)
) ENGINE=InnoDB;

CREATE TABLE quiz_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  answers JSON NOT NULL,
  scores JSON NOT NULL,
  assigned_avatar_id BIGINT UNSIGNED NOT NULL,
  tie_broken TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_qs_user (user_id),
  CONSTRAINT fk_qs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_qs_avatar FOREIGN KEY (assigned_avatar_id) REFERENCES avatars(id)
) ENGINE=InnoDB;

-- ───────────────────────── Admin & RBAC ─────────────────────────

CREATE TABLE admin_roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_roles_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE admin_permissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL,
  description VARCHAR(255) NULL,
  UNIQUE KEY uq_perms_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE admin_role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_arp_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_arp_perm FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_admins_email (email),
  CONSTRAINT fk_admins_role FOREIGN KEY (role_id) REFERENCES admin_roles(id)
) ENGINE=InnoDB;

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(60) NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  meta JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_admin (admin_user_id, id DESC),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
) ENGINE=InnoDB;

-- ───────────────────────── Forum taxonomy ─────────────────────────

CREATE TABLE communities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(40) NOT NULL,
  handle VARCHAR(50) NOT NULL,
  color CHAR(7) NOT NULL DEFAULT '#ff5a6a',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_communities_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE flairs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(30) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_flairs_label (label)
) ENGINE=InnoDB;

-- ───────────────────────── Media (uploads registry) ─────────────────────────

CREATE TABLE media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('image') NOT NULL DEFAULT 'image',
  file_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  width INT NULL,
  height INT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_media_user (user_id),
  CONSTRAINT fk_media_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ───────────────────────── Forum content ─────────────────────────

CREATE TABLE posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  community_id BIGINT UNSIGNED NULL,
  flair_id BIGINT UNSIGNED NULL,
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  is_spoiler TINYINT(1) NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  hot_score DOUBLE NOT NULL DEFAULT 0,
  status ENUM('active','hidden','deleted') NOT NULL DEFAULT 'active',
  moderated_by BIGINT UNSIGNED NULL,
  moderated_at DATETIME(3) NULL,
  moderation_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_posts_new (status, id DESC),
  KEY idx_posts_top (status, score DESC, id DESC),
  KEY idx_posts_hot (status, hot_score DESC, id DESC),
  KEY idx_posts_user (user_id, id),
  KEY idx_posts_community (community_id, id),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_posts_community FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE SET NULL,
  CONSTRAINT fk_posts_flair FOREIGN KEY (flair_id) REFERENCES flairs(id) ON DELETE SET NULL,
  CONSTRAINT fk_posts_moderator FOREIGN KEY (moderated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE post_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  position INT NOT NULL DEFAULT 0,
  KEY idx_pm_post (post_id),
  CONSTRAINT fk_pm_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_media FOREIGN KEY (media_id) REFERENCES media(id)
) ENGINE=InnoDB;

CREATE TABLE comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  parent_comment_id BIGINT UNSIGNED NULL,
  root_comment_id BIGINT UNSIGNED NULL,
  reply_to_user_id BIGINT UNSIGNED NULL,
  body TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  status ENUM('active','hidden','deleted') NOT NULL DEFAULT 'active',
  moderated_by BIGINT UNSIGNED NULL,
  moderated_at DATETIME(3) NULL,
  moderation_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_comments_tree (post_id, root_comment_id, id),
  KEY idx_comments_status (post_id, status),
  KEY idx_comments_user (user_id, id),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_root FOREIGN KEY (root_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_reply_to FOREIGN KEY (reply_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_comments_moderator FOREIGN KEY (moderated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE post_votes (
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  value TINYINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (post_id, user_id),
  KEY idx_pv_user (user_id),
  CONSTRAINT fk_pv_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_pv_value CHECK (value IN (-1, 1))
) ENGINE=InnoDB;

CREATE TABLE comment_votes (
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  value TINYINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (comment_id, user_id),
  KEY idx_cv_user (user_id),
  CONSTRAINT fk_cv_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_cv_value CHECK (value IN (-1, 1))
) ENGINE=InnoDB;

-- ───────────────────────── MJ Wall ─────────────────────────

CREATE TABLE mj_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(500) NOT NULL,
  status ENUM('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  rejection_reason VARCHAR(255) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_mj_status (status, id DESC),
  KEY idx_mj_user (user_id, id),
  CONSTRAINT fk_mj_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_mj_reviewer FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────────────────────── Fan art ─────────────────────────

CREATE TABLE fan_art (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) NULL,
  status ENUM('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  rejection_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_fa_status (status, id DESC),
  KEY idx_fa_user (user_id, id),
  CONSTRAINT fk_fa_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_fa_media FOREIGN KEY (media_id) REFERENCES media(id),
  CONSTRAINT fk_fa_reviewer FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────────────────────── Notifications ─────────────────────────

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  type ENUM('reply','post_comment','mention','mj_approved','mj_rejected','fanart_approved','fanart_rejected','system') NOT NULL,
  post_id BIGINT UNSIGNED NULL,
  comment_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(20) NULL,
  entity_id BIGINT UNSIGNED NULL,
  snippet VARCHAR(180) NOT NULL DEFAULT '',
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_notif_inbox (user_id, read_at, id DESC),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notif_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB;
