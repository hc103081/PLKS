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

-- Seed data for auth.users table (development user)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  is_super_admin,
  raw_user_meta_data,
  raw_app_meta_data,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dev@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeG3ZiYJ3qKQf6d5Xe6VxV6v7v8v9v0vW', -- password: "password"
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  false,
  '{}',
  '{}',
  'auth',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;