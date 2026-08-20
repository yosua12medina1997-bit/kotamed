
drop policy if exists ward_problems_read on public.ward_problems;
create policy ward_problems_read on public.ward_problems for select to authenticated
using (private.is_ward_staff(auth.uid()) or created_by = auth.uid());

drop policy if exists ward_tasks_read on public.ward_tasks;
create policy ward_tasks_read on public.ward_tasks for select to authenticated
using (private.is_ward_staff(auth.uid()) or created_by = auth.uid());

drop policy if exists ward_assignments_read on public.ward_assignments;
create policy ward_assignments_read on public.ward_assignments for select to authenticated
using (private.is_ward_staff(auth.uid()) or user_id = auth.uid());

drop policy if exists ward_cases_read on public.ward_learning_cases;
create policy ward_cases_read on public.ward_learning_cases for select to authenticated
using (private.is_ward_staff(auth.uid()) or author_id = auth.uid() or created_by = auth.uid());
