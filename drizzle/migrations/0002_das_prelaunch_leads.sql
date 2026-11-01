CREATE TABLE public.das_prelaunch_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 30),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.das_prelaunch_leads TO anon, authenticated;
GRANT SELECT ON public.das_prelaunch_leads TO authenticated;
GRANT ALL ON public.das_prelaunch_leads TO service_role;
ALTER TABLE public.das_prelaunch_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit DAS interest" ON public.das_prelaunch_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read DAS leads" ON public.das_prelaunch_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));