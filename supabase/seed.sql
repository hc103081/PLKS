-- Seed data for semesters table
INSERT INTO semesters (code, year, term, label, sort_order) VALUES
('103-1', 103, 1, '大一上', 1),
('103-2', 103, 2, '大一下', 2),
('104-1', 104, 1, '大二上', 3),
('104-2', 104, 2, '大二下', 4),
('105-1', 105, 1, '大三上', 5),
('105-2', 105, 2, '大三下', 6),
('106-1', 106, 1, '大四上', 7),
('106-2', 106, 2, '大四下', 8)
ON CONFLICT (code) DO NOTHING;