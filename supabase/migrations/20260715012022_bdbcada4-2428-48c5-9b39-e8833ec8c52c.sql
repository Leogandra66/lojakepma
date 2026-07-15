
CREATE TABLE public.bling_auth (
  id INT PRIMARY KEY DEFAULT 1,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_sync_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bling_auth_singleton CHECK (id = 1)
);

GRANT ALL ON public.bling_auth TO service_role;

ALTER TABLE public.bling_auth ENABLE ROW LEVEL SECURITY;

-- No client policies: table is service_role only.

CREATE TRIGGER update_bling_auth_updated_at
  BEFORE UPDATE ON public.bling_auth
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.bling_auth (id) VALUES (1) ON CONFLICT DO NOTHING;
