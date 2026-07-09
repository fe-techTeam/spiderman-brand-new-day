-- One-time backfill: re-sync every post's denormalized comment_count to its
-- live active-comment total. Moderation used to change a comment's status
-- without touching the counter, so posts moderated before the recount fix
-- (lib/server/forum.js recountPostComments) still carry inflated counts —
-- the forum card badge says "2 Comments" while the thread renders 1.
-- Every status-change path now recounts inline; this settles the history.

UPDATE posts p
SET p.comment_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.post_id = p.id AND c.status = 'active'
);
