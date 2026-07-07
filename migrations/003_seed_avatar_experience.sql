-- 003_seed_avatar_experience.sql — the 11 avatars + 4 questions × 5 options with the
-- client's exact primary/secondary mapping (2 pts primary, 1 pt secondary).
-- NOTE: the client's mapping references "The Problem Solver", but their descriptions list
-- "The Survivor" (never awarded by the mapping). Both are seeded; the admin panel's mapping
-- editor resolves the conflict. See BACKEND.md §16.1.

INSERT INTO avatars (slug, name, emoji, tagline, description, color, sort_order) VALUES
  ('protector',      'The Protector',      '🛡️', 'Responsibility isn''t a burden — it''s your superpower.',
   'You instinctively put others before yourself. Responsibility isn''t a burden — it''s your superpower.', '#ffd23f', 1),
  ('fighter',        'The Fighter',        '⚡', 'You take the leap and keep moving forward.',
   'You don''t wait for the perfect moment. You take the leap, face the challenge, and keep moving forward.', '#ff5a6a', 2),
  ('dreamer',        'The Dreamer',        '🌙', 'Every ending is the beginning of something bigger.',
   'Curiosity drives you. You believe every ending is the beginning of something bigger.', '#b28dff', 3),
  ('connector',      'The Connector',      '🕸️', 'Every hero is stronger because of the people around them.',
   'Your strength lies in bringing people together. Every hero is stronger because of the people around them.', '#4d8bff', 4),
  ('believer',       'The Believer',       '✨', 'Every Brand New Day begins with believing it''s possible.',
   'Even when things fall apart, you choose hope. You know every Brand New Day begins with believing it''s possible.', '#ffe08a', 5),
  ('underdog',       'The Underdog',       '💥', 'Being underestimated is exactly where your story begins.',
   'People may underestimate you. That''s exactly where your story begins.', '#ff9f43', 6),
  ('strategist',     'The Strategist',     '🧠', 'Your superpower is knowing exactly when to use it.',
   'You observe before you act. Your greatest superpower isn''t strength — it''s knowing exactly when to use it.', '#7ee787', 7),
  ('trailblazer',    'The Trailblazer',    '🚀', 'New beginnings don''t scare you — they excite you.',
   'You''re always ready for what''s next. New beginnings don''t scare you — they excite you.', '#5ad1e6', 8),
  ('catalyst',       'The Catalyst',       '🔥', 'Wherever you go, you motivate others to take the leap.',
   'You inspire action. Wherever you go, you motivate others to take the leap alongside you.', '#ff6b3d', 9),
  ('survivor',       'The Survivor',       '🕷️', 'Every setback has only made you stronger.',
   'Life has knocked you down before. But every setback has only made you stronger.', '#c0313f', 10),
  ('problem-solver', 'The Problem Solver', '🧩', 'There''s always another way — and you''ll find it.',
   'Referenced by the client''s mapping table (pending final copy). You stay calm and find the smartest way through.', '#9aa7ff', 11);

-- Questions (position = display order; Q4 "Brand New Day" is the tie-breaker per client spec)
INSERT INTO quiz_questions (position, text, is_tiebreaker) VALUES
  (1, 'What''s your first instinct in a crisis?', 0),
  (2, 'If you had one Spider-Man power, you''d choose:', 0),
  (3, 'What do people rely on you for the most?', 0),
  (4, 'What does a Brand New Day look like to you?', 1);

-- Options: client mapping verbatim (primary = 2 pts, secondary = 1 pt)
-- Q1 — What's your first instinct in a crisis?
INSERT INTO quiz_options (question_id, position, text, primary_avatar_id, secondary_avatar_id)
SELECT q.id, o.pos, o.txt,
       (SELECT id FROM avatars WHERE slug = o.prim),
       (SELECT id FROM avatars WHERE slug = o.sec)
FROM quiz_questions q
JOIN (
  SELECT 1 AS pos, 'Protect people first' AS txt, 'protector' AS prim, 'connector' AS sec UNION ALL
  SELECT 2, 'Jump in without thinking',        'fighter',    'trailblazer' UNION ALL
  SELECT 3, 'Figure out what''s happening',    'strategist', 'dreamer' UNION ALL
  SELECT 4, 'Call everyone together',          'connector',  'catalyst' UNION ALL
  SELECT 5, 'Stay calm and find another way',  'believer',   'problem-solver'
) o
WHERE q.position = 1;

-- Q2 — If you had one Spider-Man power, you'd choose:
INSERT INTO quiz_options (question_id, position, text, primary_avatar_id, secondary_avatar_id)
SELECT q.id, o.pos, o.txt,
       (SELECT id FROM avatars WHERE slug = o.prim),
       (SELECT id FROM avatars WHERE slug = o.sec)
FROM quiz_questions q
JOIN (
  SELECT 1 AS pos, 'Spider-Sense' AS txt, 'strategist' AS prim, 'believer' AS sec UNION ALL
  SELECT 2, 'Web Shooters',    'connector',   'protector' UNION ALL
  SELECT 3, 'Super Strength',  'fighter',     'underdog' UNION ALL
  SELECT 4, 'Wall Crawling',   'trailblazer', 'dreamer' UNION ALL
  SELECT 5, 'Agility & Speed', 'underdog',    'catalyst'
) o
WHERE q.position = 2;

-- Q3 — What do people rely on you for the most?
INSERT INTO quiz_options (question_id, position, text, primary_avatar_id, secondary_avatar_id)
SELECT q.id, o.pos, o.txt,
       (SELECT id FROM avatars WHERE slug = o.prim),
       (SELECT id FROM avatars WHERE slug = o.sec)
FROM quiz_questions q
JOIN (
  SELECT 1 AS pos, 'Keeping everyone safe' AS txt, 'protector' AS prim, 'believer' AS sec UNION ALL
  SELECT 2, 'Taking the first step',           'fighter',    'trailblazer' UNION ALL
  SELECT 3, 'Finding the smartest solution',   'strategist', 'problem-solver' UNION ALL
  SELECT 4, 'Bringing people together',        'connector',  'catalyst' UNION ALL
  SELECT 5, 'Never giving up',                 'underdog',   'believer'
) o
WHERE q.position = 3;

-- Q4 — What does a Brand New Day look like to you? (tie-breaker)
INSERT INTO quiz_options (question_id, position, text, primary_avatar_id, secondary_avatar_id)
SELECT q.id, o.pos, o.txt,
       (SELECT id FROM avatars WHERE slug = o.prim),
       (SELECT id FROM avatars WHERE slug = o.sec)
FROM quiz_questions q
JOIN (
  SELECT 1 AS pos, 'A fresh start after a setback' AS txt, 'underdog' AS prim, 'believer' AS sec UNION ALL
  SELECT 2, 'Finally taking the chance I''ve been waiting for', 'trailblazer', 'fighter' UNION ALL
  SELECT 3, 'Becoming a better version of myself',              'believer',    'problem-solver' UNION ALL
  SELECT 4, 'Starting over with the people who matter',         'connector',   'protector' UNION ALL
  SELECT 5, 'Discovering a completely new path',                'dreamer',     'trailblazer'
) o
WHERE q.position = 4;
