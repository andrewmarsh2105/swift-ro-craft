ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS week_start_day integer NOT NULL DEFAULT 0;