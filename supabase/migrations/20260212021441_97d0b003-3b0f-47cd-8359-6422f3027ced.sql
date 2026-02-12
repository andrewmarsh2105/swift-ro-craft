
-- Create labor_type enum
CREATE TYPE public.labor_type AS ENUM ('warranty', 'customer-pay', 'internal');

-- Create ro_status enum
CREATE TYPE public.ro_status AS ENUM ('draft', 'complete');

-- ==================== TABLES ====================

-- Repair Orders
CREATE TABLE public.ros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ro_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  advisor_id TEXT,
  advisor_name TEXT NOT NULL DEFAULT '',
  status public.ro_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RO Lines
CREATE TABLE public.ro_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ro_id UUID NOT NULL REFERENCES public.ros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  labor_type public.labor_type NOT NULL DEFAULT 'customer-pay',
  hours_paid NUMERIC(6,2) NOT NULL DEFAULT 0,
  matched_reference_id UUID,
  match_confidence NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Labor References (presets)
CREATE TABLE public.labor_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_hours NUMERIC(6,2) DEFAULT 0,
  labor_type_default public.labor_type NOT NULL DEFAULT 'customer-pay',
  keywords TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RO Photos
CREATE TABLE public.ro_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ro_id UUID NOT NULL REFERENCES public.ros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RO Templates
CREATE TABLE public.ro_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sample_photo_path TEXT,
  field_map_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== INDEXES ====================

CREATE INDEX idx_ros_user_date ON public.ros (user_id, date);
CREATE INDEX idx_ros_user_ro_number ON public.ros (user_id, ro_number);
CREATE INDEX idx_ro_lines_ro_id ON public.ro_lines (ro_id);
CREATE INDEX idx_ro_lines_user_id ON public.ro_lines (user_id);
CREATE INDEX idx_ro_photos_ro_id ON public.ro_photos (ro_id);
CREATE INDEX idx_labor_references_user_id ON public.labor_references (user_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);

-- ==================== UPDATED_AT TRIGGER ====================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ros_updated_at BEFORE UPDATE ON public.ros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ro_lines_updated_at BEFORE UPDATE ON public.ro_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_labor_references_updated_at BEFORE UPDATE ON public.labor_references FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ro_templates_updated_at BEFORE UPDATE ON public.ro_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== HELPER FUNCTION ====================

CREATE OR REPLACE FUNCTION public.owns_ro(_user_id UUID, _ro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ros WHERE id = _ro_id AND user_id = _user_id
  )
$$;

-- ==================== RLS ====================

ALTER TABLE public.ros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ro_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ro_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ro_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ros: users CRUD their own
CREATE POLICY "Users select own ros" ON public.ros FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own ros" ON public.ros FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own ros" ON public.ros FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own ros" ON public.ros FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ro_lines: users CRUD their own (also verify RO ownership via helper)
CREATE POLICY "Users select own ro_lines" ON public.ro_lines FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own ro_lines" ON public.ro_lines FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.owns_ro(auth.uid(), ro_id));
CREATE POLICY "Users update own ro_lines" ON public.ro_lines FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own ro_lines" ON public.ro_lines FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ro_photos: users CRUD their own
CREATE POLICY "Users select own ro_photos" ON public.ro_photos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own ro_photos" ON public.ro_photos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.owns_ro(auth.uid(), ro_id));
CREATE POLICY "Users delete own ro_photos" ON public.ro_photos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- labor_references: users CRUD their own
CREATE POLICY "Users select own labor_references" ON public.labor_references FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own labor_references" ON public.labor_references FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own labor_references" ON public.labor_references FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own labor_references" ON public.labor_references FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ro_templates: users CRUD their own
CREATE POLICY "Users select own ro_templates" ON public.ro_templates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own ro_templates" ON public.ro_templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own ro_templates" ON public.ro_templates FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own ro_templates" ON public.ro_templates FOR DELETE TO authenticated USING (user_id = auth.uid());

-- audit_log: users can only insert their own and read their own
CREATE POLICY "Users insert own audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users select own audit_log" ON public.audit_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ==================== STORAGE BUCKET ====================

INSERT INTO storage.buckets (id, name, public) VALUES ('ro-photos', 'ro-photos', false);

CREATE POLICY "Users upload own ro photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own ro photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own ro photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ro-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
