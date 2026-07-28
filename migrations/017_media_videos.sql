-- 017_media_videos.sql — the landing page "Media" section: an admin-curated
-- YouTube carousel. Admins paste a video link + title in the panel; the site
-- stores only the parsed 11-char YouTube id (thumbnails and playback both
-- derive from it). The section hides itself while no active rows exist.

CREATE TABLE media_videos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  youtube_id VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_mv_order (sort_order, id),
  CONSTRAINT fk_mv_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO admin_permissions (slug, description) VALUES
  ('media.manage', 'Manage the landing page Media section videos');

-- Master content, same grant shape as quiz/avatars: super_admin + content_manager.
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug IN ('super_admin', 'content_manager') AND p.slug = 'media.manage';
