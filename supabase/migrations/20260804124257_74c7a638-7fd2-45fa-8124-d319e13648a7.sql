ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

COMMENT ON COLUMN public.payments.metadata IS 'Detalhes de diagnóstico do gateway (erros, payload de webhooks, etc.)';