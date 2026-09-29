CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  brand_name text NOT NULL DEFAULT '',
  product_name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  template text NOT NULL DEFAULT 'luxury',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_path text,
  model_url text,
  model_filename text,
  model_size bigint,
  model_source text CHECK (model_source IN ('upload','mock')),
  model_status text NOT NULL DEFAULT 'none' CHECK (model_status IN ('none','processing','ready','failed')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone reads published projects" ON public.projects FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  slot text NOT NULL CHECK (slot IN ('front','back','left','right','top')),
  path text NOT NULL,
  filename text NOT NULL,
  size bigint NOT NULL,
  width int,
  height int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage images" ON public.product_images FOR ALL TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE TRIGGER product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Owners read assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners upload assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public reads published models" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-assets' AND (storage.foldername(name))[3] = 'model'
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = (storage.foldername(name))[2] AND p.status = 'published'));