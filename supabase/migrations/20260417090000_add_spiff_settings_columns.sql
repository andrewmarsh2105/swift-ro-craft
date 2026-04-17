alter table public.user_settings
  add column if not exists spiff_rules jsonb not null default '[]'::jsonb,
  add column if not exists spiff_manual_entries jsonb not null default '[]'::jsonb;
