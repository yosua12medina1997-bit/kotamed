
create or replace function private.is_ward_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select _user_id is not null and (
    private.is_ward_admin(_user_id)
    or exists (select 1 from public.ward_assignments a where a.user_id = _user_id and a.active)
    or private.has_content_access('0db73b5f-e9ab-49a3-bcca-6e070cc4fa5b'::uuid)
  )
$$;
revoke all on function private.is_ward_staff(uuid) from public, anon, authenticated;

drop policy if exists ward_patients_read on public.ward_patients;
create policy ward_patients_read on public.ward_patients for select to authenticated
using (private.is_ward_staff(auth.uid()) or created_by = auth.uid());

drop policy if exists ward_evolutions_read on public.ward_evolutions;
create policy ward_evolutions_read on public.ward_evolutions for select to authenticated
using (private.is_ward_staff(auth.uid()) or author_id = auth.uid() or created_by = auth.uid());

drop policy if exists ward_plan_read on public.ward_plan_items;
create policy ward_plan_read on public.ward_plan_items for select to authenticated
using (private.is_ward_staff(auth.uid()) or created_by = auth.uid());
