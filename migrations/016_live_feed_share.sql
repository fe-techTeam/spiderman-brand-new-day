-- 016_live_feed_share.sql — toggle for the Webshots reel's Share button.
-- OFF (default) hides it; an admin flips it ON from the panel when sharing is
-- ready to go live. Absent row already reads as OFF (getSetting !== "1"); this
-- seeds it so it shows up as a known switch.
INSERT INTO settings (name, value) VALUES ('live_feed_share', '0');
