-- 002_seed_rbac.sql — roles, permissions, role-permission matrix. See BACKEND.md §3.7.

INSERT INTO admin_roles (slug, name, description) VALUES
  ('super_admin',     'Super Admin',     'Full access to everything, including admin management'),
  ('moderator',       'Moderator',       'User + forum moderation, MJ Wall and fan-art review'),
  ('content_manager', 'Content Manager', 'Quiz, avatar and approval-queue content management');

INSERT INTO admin_permissions (slug, description) VALUES
  ('dashboard.view',  'View the admin dashboard'),
  ('users.view',      'View portal users'),
  ('users.manage',    'Disable / enable portal users'),
  ('forum.moderate',  'Hide / unhide forum posts and comments'),
  ('mj.review',       'Approve / reject / hide MJ Wall messages'),
  ('fanart.review',   'Approve / reject / hide fan art'),
  ('quiz.manage',     'Manage quiz questions, options and avatar mapping'),
  ('avatars.manage',  'Manage avatar identities'),
  ('admins.manage',   'Manage admin accounts and roles'),
  ('audit.view',      'View the admin audit log');

-- super_admin: everything
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug = 'super_admin';

-- moderator
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug = 'moderator'
  AND p.slug IN ('dashboard.view','users.view','users.manage','forum.moderate','mj.review','fanart.review','audit.view');

-- content_manager
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p
WHERE r.slug = 'content_manager'
  AND p.slug IN ('dashboard.view','quiz.manage','avatars.manage','mj.review','fanart.review');
