-- 1) admission_applications: block applicants from spoofing review fields
CREATE OR REPLACE FUNCTION public.guard_admission_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    NEW.admin_notes := OLD.admin_notes;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.approved_expires_at := OLD.approved_expires_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_admission_review_fields ON public.admission_applications;
CREATE TRIGGER trg_guard_admission_review_fields
BEFORE UPDATE ON public.admission_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_admission_review_fields();

-- 2) cms_settings: limit anonymous reads to non-sensitive columns
REVOKE SELECT ON public.cms_settings FROM anon;
GRANT SELECT (id, safe_mode, home_page_id, updated_at) ON public.cms_settings TO anon;

-- 3) ui_menu_prefs: explicit public flag instead of prefix matching
ALTER TABLE public.ui_menu_prefs
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.ui_menu_prefs
SET is_public = true
WHERE scope = 'hero-home' OR scope LIKE 'page-%';

DROP POLICY IF EXISTS ui_menu_prefs_public_pages_read ON public.ui_menu_prefs;
CREATE POLICY ui_menu_prefs_public_pages_read
ON public.ui_menu_prefs
FOR SELECT
TO anon
USING (is_public = true);

-- 4) ward_patients: deletion requires super admin AND active ward staff
DROP POLICY IF EXISTS ward_patients_delete ON public.ward_patients;
CREATE POLICY ward_patients_delete
ON public.ward_patients
FOR DELETE
TO authenticated
USING (
  private.has_role(auth.uid(), 'super_admin'::public.app_role)
  AND private.is_ward_staff(auth.uid())
);