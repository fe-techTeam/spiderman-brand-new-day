-- 008_avatar_profile_asset.sql — per-avatar profile picture, managed in
-- Admin → Avatars. Every member inherits the picture of their assigned
-- avatar wherever they appear: forum posts, comments, and the MJ Wall.

ALTER TABLE avatars ADD COLUMN profile_asset VARCHAR(255) NULL AFTER badge_asset;
