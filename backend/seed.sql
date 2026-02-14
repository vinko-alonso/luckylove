-- RESETEA TABLAS PUBLICAS (ajusta si agregaste mas tablas)
truncate table
  public.review_entries,
  public.reviews,
  public.review_types,
  public.calendar_day_ratings,
  public.calendar_photos,
  public.calendar_days,
  public.home_daily_answers,
  public.home_daily_questions,
  public.home_messages,
  public.couple_star_events,
  public.couple_rewards,
  public.home_challenges,
  public.couple_levels,
  public.profiles,
  public.couples
restart identity cascade;

-- COUPLE BASE
insert into public.couples (id, code, member_count, relationship_start_date, meet_date)
values (
  '11111111-1111-1111-1111-111111111111',
  'BASE123',
  1,
  '2024-02-14',
  '2024-01-20'
);

-- PERFIL DEBUG (user_id se setea luego con el script)
-- placeholder temporal; se actualiza con script Node
insert into public.profiles (user_id, email, couple_id, connect_code, alias)
values (
  '00000000-0000-0000-0000-000000000000',
  'base@luckylove.dev',
  '11111111-1111-1111-1111-111111111111',
  'BASE123',
  'Base'
);

-- RETOS Y ESTRELLAS
insert into public.home_challenges (id, couple_id, created_by, title, description, stars, status)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Cena sorpresa', 'Preparar una cena', 3, 'completed'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Pelicula juntos', null, 2, 'pending');

insert into public.couple_star_events (couple_id, challenge_id, awarded_to, stars)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 3);

-- BENEFICIOS
insert into public.couple_rewards (id, couple_id, title, description, stars_required, created_by)
values
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Masaje', '15 minutos', 2, '00000000-0000-0000-0000-000000000000'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Desayuno en cama', null, 3, '00000000-0000-0000-0000-000000000000');

-- REVIEW TYPES (si no estan)
insert into public.review_types (key, label, sort_order)
values
  ('restoran', 'Restoran', 1),
  ('pelicula', 'Pelicula', 2)
on conflict (key) do nothing;