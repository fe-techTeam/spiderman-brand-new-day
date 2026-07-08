-- 009: forum reporting + moderation strike ladder.
--
-- Fans report a post/comment; moderators dismiss (content is fine) or take it
-- down (content hidden). A takedown is a "strike" against the author, and the
-- Nth strike escalates a consequence: 1 → 24h posting ban, 2 → 48h, 3 → 1 week
-- (all: no forum posts/comments and no MJ Wall messages), 4+ → full account
-- suspension. See the report + moderation route handlers for the enforcement.

CREATE TABLE reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_user_id BIGINT UNSIGNED NOT NULL,
  entity_type ENUM('post','comment') NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,          -- polymorphic: posts.id or comments.id (no FK)
  reason VARCHAR(500) NOT NULL,
  status ENUM('open','dismissed','actioned') NOT NULL DEFAULT 'open',
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  -- one report per user per piece of content
  UNIQUE KEY uq_reports_reporter_entity (reporter_user_id, entity_type, entity_id),
  KEY idx_reports_queue (status, id DESC),
  KEY idx_reports_entity (entity_type, entity_id, status),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_resolver FOREIGN KEY (resolved_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Strike bookkeeping on the offender. takedown_count is cumulative (never reset
-- here); forum_ban_until gates forum + MJ Wall posting (NULL / past = allowed).
-- A 4th strike flips users.status to 'disabled' instead (full suspension).
ALTER TABLE users
  ADD COLUMN takedown_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN forum_ban_until DATETIME(3) NULL AFTER takedown_count;

-- New notification the offender receives when their content is taken down; it
-- carries the consequence text in `snippet`.
ALTER TABLE notifications
  MODIFY COLUMN type ENUM(
    'reply','post_comment','mention',
    'mj_approved','mj_rejected','fanart_approved','fanart_rejected',
    'post_removed','system'
  ) NOT NULL;
