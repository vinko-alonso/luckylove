create extension if not exists "pgcrypto";

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  member_count integer not null default 0,
  relationship_start_date date,
  meet_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text,
  email text not null unique,
  couple_id uuid references public.couples(id) on delete set null,
  photo_url text,
  birthday date,
  favorite_food text,
  personality_type text,
  whatsapp_url text,
  instagram_url text,
  tiktok_url text,
  linkedin_url text,
  theme_light jsonb,
  theme_dark jsonb,
  connect_code text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.home_daily_questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  question text not null,
  source text not null default 'user',
  asked_by uuid references auth.users(id) on delete set null,
  asked_at timestamptz not null default now()
);

create table if not exists public.home_daily_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.home_daily_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.home_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.home_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  stars integer not null default 1,
  status text not null default 'pending',
  accepted_by uuid references auth.users(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  reported_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.home_daily_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  stars integer not null default 1,
  day_date date not null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  stars_required integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_levels (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_star_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  challenge_id uuid references public.home_challenges(id) on delete set null,
  awarded_to uuid references auth.users(id) on delete set null,
  stars integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  day_date date not null,
  owner_type text not null default 'couple',
  owner_user_id uuid references auth.users(id) on delete set null,
  note_text text,
  print_style text,
  check_style text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (couple_id, day_date, owner_type, owner_user_id)
);

create table if not exists public.calendar_photos (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  photo_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists expo_push_token text,
  add column if not exists terms_accepted_at timestamptz;

create table if not exists public.home_notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  message text,
  seen_by uuid[] not null default array[]::uuid[],
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_day_ratings (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric(4,1) not null,
  created_at timestamptz not null default now(),
  unique (day_id, user_id)
);

create table if not exists public.calendar_day_favorites (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (day_id, user_id)
);

create table if not exists public.calendar_songs (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  spotify_track_id text not null,
  title text,
  artist text,
  preview_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  photo_url text,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_types (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.review_types (key, label, sort_order)
values
  ('restoran', 'Restoran', 1),
  ('panorama', 'Panorama', 2),
  ('comida', 'Comida', 3),
  ('juego', 'Juego', 4),
  ('serie', 'Serie', 5),
  ('pelicula', 'Pelicula', 6),
  ('persona', 'Persona', 7)
on conflict (key) do nothing;

create table if not exists public.review_entries (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  review_text text,
  rating numeric(4,1) not null,
  created_at timestamptz not null default now(),
  unique (review_id, author_id)
);

alter table if exists public.couple_rewards
  add column if not exists description text,
  add column if not exists redeemed_by uuid references auth.users(id) on delete set null;

alter table if exists public.couple_star_events
  add column if not exists reward_id uuid references public.couple_rewards(id) on delete set null;

create table if not exists public.home_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  stars integer not null default 1,
  status text not null default 'pending',
  accepted_by uuid references auth.users(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  reported_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  stars_required integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_levels (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_star_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  challenge_id uuid references public.home_challenges(id) on delete set null,
  awarded_to uuid references auth.users(id) on delete set null,
  stars integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  day_date date not null,
  owner_type text not null default 'couple',
  owner_user_id uuid references auth.users(id) on delete set null,
  note_text text,
  print_style text,
  check_style text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (couple_id, day_date, owner_type, owner_user_id)
);

create table if not exists public.calendar_photos (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  photo_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_songs (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  spotify_track_id text not null,
  title text,
  artist text,
  preview_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  photo_url text,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_entries (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  review_text text,
  rating numeric(4,1) not null,
  created_at timestamptz not null default now(),
  unique (review_id, author_id)
);

create table if not exists public.home_challenges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  stars integer not null default 1,
  status text not null default 'pending',
  accepted_by uuid references auth.users(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  reported_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null,
  stars_required integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_levels (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  level integer not null default 1,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_star_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  challenge_id uuid references public.home_challenges(id) on delete set null,
  awarded_to uuid references auth.users(id) on delete set null,
  stars integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  day_date date not null,
  owner_type text not null default 'couple',
  owner_user_id uuid references auth.users(id) on delete set null,
  note_text text,
  print_style text,
  check_style text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (couple_id, day_date, owner_type, owner_user_id)
);

create table if not exists public.calendar_photos (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  photo_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_songs (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.calendar_days(id) on delete cascade,
  spotify_track_id text not null,
  title text,
  artist text,
  preview_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  photo_url text,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.review_entries (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  review_text text,
  rating numeric(4,1) not null,
  created_at timestamptz not null default now(),
  unique (review_id, author_id)
);
