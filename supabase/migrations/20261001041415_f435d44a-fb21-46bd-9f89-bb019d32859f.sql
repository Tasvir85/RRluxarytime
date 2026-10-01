CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE TABLE public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  version integer NOT NULL,
  source text NOT NULL,
  provider text,
  status text NOT NULL DEFAULT 'processing',
  original_path text,
  original_size bigint,
  optimized_path text,
  optimized_size bigint,
  filename text,
  thumbnails jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  optimization jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_versions TO authenticated;
GRANT SELECT ON public.model_versions TO anon;
GRANT ALL ON public.model_versions TO service_role;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage versions" ON public.model_versions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.user_id=auth.uid()));
CREATE TRIGGER model_versions_updated_at BEFORE UPDATE ON public.model_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.projects ADD COLUMN active_model_version_id uuid REFERENCES public.model_versions(id) ON DELETE SET NULL;
ALTER TABLE public.product_images ADD COLUMN analysis jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE POLICY "Anyone reads active version of published" ON public.model_versions FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.active_model_version_id = model_versions.id AND p.status='published'));

CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  job_number integer NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED',
  stage text,
  progress integer NOT NULL DEFAULT 0,
  attempt integer NOT NULL DEFAULT 1,
  provider_job_id text,
  input_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version_id uuid REFERENCES public.model_versions(id) ON DELETE SET NULL,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_cost numeric,
  actual_cost numeric,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.generation_jobs TO authenticated;
GRANT ALL ON public.generation_jobs TO service_role;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read jobs" ON public.generation_jobs FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert jobs" ON public.generation_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.user_id=auth.uid()));
CREATE POLICY "Owners update jobs" ON public.generation_jobs FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER generation_jobs_updated_at BEFORE UPDATE ON public.generation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_job_transition() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  ok := CASE OLD.status
    WHEN 'QUEUED' THEN NEW.status IN ('ANALYZING','FAILED','CANCELLED')
    WHEN 'ANALYZING' THEN NEW.status IN ('GENERATING','FAILED','CANCELLED')
    WHEN 'GENERATING' THEN NEW.status IN ('DOWNLOADING','FAILED','CANCELLED')
    WHEN 'DOWNLOADING' THEN NEW.status IN ('VALIDATING','FAILED','CANCELLED')
    WHEN 'VALIDATING' THEN NEW.status IN ('OPTIMIZING','FAILED','CANCELLED')
    WHEN 'OPTIMIZING' THEN NEW.status IN ('READY_FOR_REVIEW','FAILED','CANCELLED')
    WHEN 'READY_FOR_REVIEW' THEN NEW.status IN ('APPROVED','CANCELLED')
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'Invalid job transition % -> %', OLD.status, NEW.status; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER generation_jobs_transition BEFORE UPDATE ON public.generation_jobs FOR EACH ROW EXECUTE FUNCTION public.guard_job_transition();

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  provider text NOT NULL,
  generation_type text NOT NULL,
  status text NOT NULL,
  estimated_cost numeric,
  actual_cost numeric,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners/admins read usage" ON public.usage_events FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads active published model files" ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id='project-assets' AND (storage.foldername(name))[3]='models' AND EXISTS (
    SELECT 1 FROM public.projects p JOIN public.model_versions v ON v.id=p.active_model_version_id
    WHERE p.status='published' AND (v.optimized_path=name OR v.original_path=name OR v.thumbnails::text LIKE '%' || name || '%')));