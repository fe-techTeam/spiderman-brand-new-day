-- 015_live_feed_author.sql — freeform attribution for Webshots posts.
-- Admins receive photos/videos from people off-platform and want to credit
-- them by name/handle. This is a plain display label ("@petey", "Aunt May",
-- whatever they type) — it connects to nothing, it's just who the drop came
-- from. NULL means no attribution: the row falls back to the member handle
-- (u/username) or the house account ("Spidey Admin").
ALTER TABLE live_feed ADD COLUMN author_name VARCHAR(120) NULL AFTER admin_id;
