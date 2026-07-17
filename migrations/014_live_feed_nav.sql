-- 014_live_feed_nav.sql — soft-launch switch for the Live Feed. The page URL
-- stays reachable, but the site navbar only links to it when an admin flips
-- this ON (admin panel → Live Feed → "Show on website"). Default OFF: the
-- feature is admin-only until release.
INSERT INTO settings (name, value) VALUES ('live_feed_nav_visible', '0');
