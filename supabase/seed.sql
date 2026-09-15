-- Seed data for USA GAMING
-- Run after schema migration. Create an admin user in Auth first, then update profile role.

-- Cafe settings
insert into public.cafe_settings (cafe_name, address, phone, email, opening_time, closing_time, timezone, currency)
select
  'USA GAMING',
  '42 Gaming Street, Level 2, Metro Mall, Mumbai 400001',
  '+91 98765 43210',
  'hello@usagaming.com',
  '10:00',
  '23:00',
  'Asia/Kolkata',
  'INR'
where not exists (select 1 from public.cafe_settings);

-- Screens (5 PS5)
insert into public.screens (name, console_type, display_name, status, hourly_rate, is_active)
select * from (values
  ('SCREEN 01', 'PS5'::console_type, '120Hz OLED', 'available'::screen_status, 89::numeric, true),
  ('SCREEN 02', 'PS5'::console_type, '120Hz OLED', 'available'::screen_status, 89::numeric, true),
  ('SCREEN 03', 'PS5'::console_type, '120Hz OLED', 'available'::screen_status, 89::numeric, true),
  ('SCREEN 04', 'PS5'::console_type, '4K HDR', 'available'::screen_status, 89::numeric, true),
  ('SCREEN 05', 'PS5'::console_type, 'Racing Rig', 'available'::screen_status, 89::numeric, true)
) as v(name, console_type, display_name, status, hourly_rate, is_active)
where not exists (select 1 from public.screens limit 1);

-- Games
insert into public.games (name, description, image_url, category, min_players, max_players, multiplayer, local_multiplayer, online_multiplayer, is_active)
select * from (values
  ('EA FC', 'The latest football simulation — local and online matches.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhTM5xhFqxFMTUdAng7WRk1VP593ePCRc1h263-ICWFIAfy_OJz6qCyjxn&s=10', 'Sports'::game_category, 1, 4, true, true, true, true),
  ('GTA V', 'Open-world action adventure in Los Santos.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOf8J5VcB8Io-brsxFuHO9wWZyHt0eSkCnRWojakyfOA&s', 'Action'::game_category, 1, 2, true, false, true, true),
  ('Tekken', 'Legendary fighting franchise with deep combat.', 'https://image.api.playstation.com/vulcan/ap/rnd/202212/2009/04S9doVJzhHa0OE8o8wax88S.png', 'Fighting'::game_category, 1, 2, true, true, true, true),
  ('WWE', 'Over-the-top wrestling action and exhibitions.', 'https://image.api.playstation.com/vulcan/ap/rnd/202511/2716/a1a698c1912cbafeaec1744f804491492af00a1c359d5806.png', 'Sports'::game_category, 1, 4, true, true, true, true),
  ('Call of Duty', 'Fast-paced FPS campaigns and multiplayer.', 'https://play-lh.googleusercontent.com/cKXlbU72_2wSXdjcD_zPWED3EVaaOQVqqHgiA9JoRQMprYen49arNUMTngcRc9UWLnv-ANT9gyQBDQpvAn61lg', 'Action'::game_category, 1, 2, true, false, true, true),
  ('F1', 'Official Formula 1 racing simulation.', 'https://play-lh.googleusercontent.com/u2qi5FiPxN0jkXx7qLwmtcvbZ0NKeYS4rzTOb83-w-_MHH71IFtPZ8wUPM2tDDDk5FRlV5pmJtGNG3T0o_uf', 'Racing'::game_category, 1, 2, true, true, true, true),
  ('Gran Turismo', 'Precision racing on legendary tracks.', 'https://image.api.playstation.com/vulcan/ap/rnd/202202/2806/xreKEb65CYM6LKfzgiNLFKlV.png', 'Racing'::game_category, 1, 2, true, true, true, true),
  ('Mortal Kombat', 'Brutal fighting with iconic characters.', 'https://play-lh.googleusercontent.com/eq6L2G3aWNK6mptbjF-N0Ybobfm7QB6K3rr8qrUSEiz-d_XfL85gaO7fBg274rqcZn_IJFnGCX4VpeUBXtgeYBM', 'Fighting'::game_category, 1, 2, true, true, true, true)
) as v(name, description, image_url, category, min_players, max_players, multiplayer, local_multiplayer, online_multiplayer, is_active)
where not exists (select 1 from public.games limit 1);

-- Pricing rules (PS5)
insert into public.pricing_rules (name, console_type, duration_minutes, price, start_time, end_time, day_type, is_active)
select * from (values
  ('PS5 30 Min', 'PS5'::console_type, 30, 49::numeric, null::time, null::time, 'all'::day_type, true),
  ('PS5 60 Min', 'PS5'::console_type, 60, 89::numeric, null::time, null::time, 'all'::day_type, true),
  ('PS5 120 Min', 'PS5'::console_type, 120, 149::numeric, null::time, null::time, 'all'::day_type, true)
) as v(name, console_type, duration_minutes, price, start_time, end_time, day_type, is_active)
where not exists (select 1 from public.pricing_rules limit 1);

-- Demo customers
insert into public.customers (name, mobile)
select * from (values
  ('Aarav Sharma', '9876543210'),
  ('Priya Patel', '9876543211'),
  ('Rohan Mehta', '9876543212'),
  ('Walk-in Customer', '0000000000')
) as v(name, mobile)
where not exists (select 1 from public.customers limit 1);

-- Example bookings for today / tomorrow (uses first screen + first game + first customer)
do $$
declare
  v_customer uuid;
  v_screen uuid;
  v_game uuid;
  v_booking uuid;
begin
  if exists (select 1 from public.bookings limit 1) then
    return;
  end if;

  select id into v_customer from public.customers where mobile = '9876543210' limit 1;
  select id into v_screen from public.screens where name = 'SCREEN 01' limit 1;
  select id into v_game from public.games where name = 'EA FC' limit 1;

  insert into public.bookings (
    customer_id, screen_id, game_id, booking_date, start_time, end_time,
    duration_minutes, players, status, total_amount, notes
  ) values
    (v_customer, v_screen, v_game, current_date, '18:00', '19:00', 60, 2, 'confirmed', 178, 'Evening slot'),
    (v_customer, null, v_game, current_date + 1, '16:00', '17:00', 60, 4, 'pending', 356, 'Birthday booking');

  -- Optional completed session yesterday for analytics
  insert into public.sessions (
    customer_id, screen_id, game_id, started_at, ended_at,
    duration_minutes, players, rate, total_amount, status
  ) values (
    v_customer,
    v_screen,
    v_game,
    (current_date - 1) + time '15:00',
    (current_date - 1) + time '16:05',
    65,
    2,
    89,
    178,
    'completed'
  )
  returning id into v_booking;

  insert into public.payments (
    session_id, amount, payment_method, payment_status, paid_at
  )
  select id, 178, 'upi', 'paid', ended_at
  from public.sessions
  where status = 'completed'
  order by created_at desc
  limit 1;
end $$;

-- After creating your first Auth user, promote to owner:
-- update public.profiles set role = 'owner' where email = 'owner@usagaming.com';
