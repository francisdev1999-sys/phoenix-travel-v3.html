INSERT INTO "Badge" (id, name, description, icon, category) VALUES
  ('founding-member',      'Founding Member',        'Joined during the founding era of the Nexus Archive',                    '🌟', 'legacy'),
  ('one-year',             'One Year Seeker',         'Member for one full year',                                               '🎂', 'milestone'),
  ('evidence-builder',     'Evidence Builder',        'Had 3 or more submissions approved',                                     '🧱', 'contribution'),
  ('reliable-contributor', 'Reliable Contributor',    'Submitted 10 or more items with less than 10%% rejection rate',          '✅', 'contribution'),
  ('trusted-researcher',   'Trusted Researcher',      'Achieved a trust score of 80 or higher',                                 '🔬', 'trust'),
  ('source-verifier',      'Source Verifier',         'Appointed as a source verification specialist',                          '📋', 'authority'),
  ('reviewer',             'Reviewer',                'Appointed as a content reviewer',                                        '👁️', 'authority'),
  ('admin',                'Administrator',           'Appointed as a platform administrator',                                  '🛡️', 'authority'),
  ('source-hunter',        'Source Hunter',           'Had 5 or more sources approved',                                         '🎯', 'contribution'),
  ('graph-connector',      'Graph Connector',         'Had 5 or more relationships approved and added to the knowledge graph',  '🕸️', 'contribution')
ON CONFLICT (id) DO NOTHING;
