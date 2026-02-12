-- Add default_template_id to user_settings
ALTER TABLE public.user_settings
ADD COLUMN default_template_id uuid REFERENCES public.ro_templates(id) ON DELETE SET NULL;