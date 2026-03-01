ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS spreadsheet_view_mode text DEFAULT 'payroll',
ADD COLUMN IF NOT EXISTS spreadsheet_density text DEFAULT 'comfortable';