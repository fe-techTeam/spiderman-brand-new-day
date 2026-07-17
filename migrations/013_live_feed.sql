-- 013_live_feed.sql — the Live Feed: a members-only media wall (/live-feed).
-- Admins seed it from the panel (author shows as "Spidy Admin"); a settings
-- toggle (default OFF) opens uploads to members, whose submissions queue for
-- approve/reject like fan art. No titles/captions — the feed is media-only.

-- Admin uploads have no portal user, so media.user_id becomes NULLable.
-- MySQL is picky about MODIFYing an FK child column — drop/re-add the FK
-- around it (the explicit idx_media_user index survives the drop).
ALTER TABLE media DROP FOREIGN KEY fk_media_user;
ALTER TABLE media MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
ALTER TABLE media ADD CONSTRAINT fk_media_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Feed rows carry exactly one author: user_id (member upload, moderated) or
-- admin_id ("Spidy Admin", inserted directly as approved).
CREATE TABLE live_feed (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  admin_id BIGINT UNSIGNED NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  rejection_reason VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_lf_status (status, id DESC),
  KEY idx_lf_user (user_id, id),
  KEY idx_lf_media (media_id),
  CONSTRAINT fk_lf_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_lf_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id),
  CONSTRAINT fk_lf_media FOREIGN KEY (media_id) REFERENCES media(id),
  CONSTRAINT fk_lf_reviewer FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT chk_lf_author CHECK ((user_id IS NULL) <> (admin_id IS NULL))
) ENGINE=InnoDB;

-- Members get notified when their submission is approved/rejected.
ALTER TABLE notifications
  MODIFY COLUMN type ENUM(
    'reply','post_comment','mention',
    'mj_approved','mj_rejected','fanart_approved','fanart_rejected',
    'post_removed','livefeed_approved','livefeed_rejected','system'
  ) NOT NULL;

INSERT INTO admin_permissions (slug, description) VALUES
  ('livefeed.manage', 'Upload to the Live Feed, review member submissions and toggle member uploads');

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug IN ('super_admin', 'moderator', 'content_manager') AND p.slug = 'livefeed.manage';

-- Member uploads toggle — OFF until the client says go.
INSERT INTO settings (name, value) VALUES ('live_feed_user_uploads', '0');
