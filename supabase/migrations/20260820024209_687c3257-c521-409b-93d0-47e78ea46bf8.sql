GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ward_patients TO authenticated;
GRANT ALL ON TABLE public.ward_patients TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ward_zones TO authenticated;
GRANT ALL ON TABLE public.ward_zones TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ward_beds TO authenticated;
GRANT ALL ON TABLE public.ward_beds TO service_role;