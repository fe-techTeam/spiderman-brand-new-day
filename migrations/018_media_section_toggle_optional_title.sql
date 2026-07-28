-- 018_media_section_toggle_optional_title.sql — Media section refinements:
--   * per-video titles are optional (cards render without a caption when blank)
--   * soft-launch switch for the whole landing section, same pattern as
--     live_feed_nav_visible. Default OFF: the section stays hidden — even with
--     videos in the list — until an admin flips it ON (panel → Media).
ALTER TABLE media_videos MODIFY COLUMN title VARCHAR(120) NULL;
INSERT INTO settings (name, value) VALUES ('media_section_visible', '0');
