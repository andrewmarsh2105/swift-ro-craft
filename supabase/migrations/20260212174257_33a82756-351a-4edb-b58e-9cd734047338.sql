
-- Add vehicle fields to ros table
ALTER TABLE public.ros
  ADD COLUMN vehicle_year smallint,
  ADD COLUMN vehicle_make text,
  ADD COLUMN vehicle_model text,
  ADD COLUMN vehicle_trim text;

-- Add per-line vehicle override fields to ro_lines
ALTER TABLE public.ro_lines
  ADD COLUMN vehicle_override boolean NOT NULL DEFAULT false,
  ADD COLUMN line_vehicle_year smallint,
  ADD COLUMN line_vehicle_make text,
  ADD COLUMN line_vehicle_model text,
  ADD COLUMN line_vehicle_trim text;

-- Add show_vehicle_chips setting to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN show_vehicle_chips boolean DEFAULT true;
