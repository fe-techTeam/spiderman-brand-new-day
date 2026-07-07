-- 004_seed_forum_taxonomy.sql — communities + flairs from the Phase-1 frontend data
-- (lib/forumData.js / app/page.jsx). See BACKEND.md §3.3.

INSERT INTO communities (slug, handle, color) VALUES
  ('protectors',    'w/Protectors',    '#ffd23f'),
  ('dreamers',      'w/Dreamers',      '#ff5a6a'),
  ('rebels',        'w/Rebels',        '#4d8bff'),
  ('spideyspotted', 'w/SpideySpotted', '#ff9f43'),
  ('prodigies',     'w/Prodigies',     '#7ee787');

INSERT INTO flairs (label) VALUES
  ('Art'), ('Sighting'), ('Build'), ('Story'), ('Cosplay');
