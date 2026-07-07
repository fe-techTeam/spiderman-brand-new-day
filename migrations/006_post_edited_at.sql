-- 006: authors can edit their posts. Only the latest version is kept (the row
-- is overwritten in place — no history), and edited_at records the time of the
-- most recent edit. NULL = never edited. updated_at can't serve this purpose:
-- it also moves on votes/comment-count writes.

ALTER TABLE posts
  ADD COLUMN edited_at DATETIME(3) NULL AFTER body;
