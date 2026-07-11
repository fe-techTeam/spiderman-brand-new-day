-- 012_share_feature.sql — "Share your identity" admin controls (client request):
-- the share-message template becomes editable in the admin panel, and every
-- click of the Share button is logged (who + when; repeat shares are separate
-- rows on purpose). Also introduces the generic `settings` key-value table —
-- first row is the share template.

CREATE TABLE settings (
  name VARCHAR(60) NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- {AvatarIdentity} resolves to the member's identity (e.g. "THE PROTECTOR 🛡️"),
-- {Link} to their personal share URL (https://spidermania.in/s/<slug>).
INSERT INTO settings (name, value) VALUES
  ('share_message_template', '🕸️ I just unmasked my Spider identity — I''m {AvatarIdentity}\nWho are YOU under the mask? Reveal yours & find your Web Twins on Spider-Man: Brand New Day 👉 {Link}');

CREATE TABLE shares (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_shares_user (user_id),
  CONSTRAINT fk_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO admin_permissions (slug, description) VALUES
  ('shares.view', 'View the share log and edit the share message template');

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug IN ('super_admin', 'content_manager') AND p.slug = 'shares.view';
