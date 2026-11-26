-- Public visitors can read job cards and reports; only the existing owner can write.
-- Existing production owner verified from farm_jobs: 366b259b-dd59-43ac-8b40-caade4a46a63
begin;

grant select on public.farm_jobs, public.farm_job_updates to anon, authenticated;

 drop policy if exists "Users can read their own farm jobs" on public.farm_jobs;
 drop policy if exists "Users can create their own farm jobs" on public.farm_jobs;
 drop policy if exists "Users can update their own farm jobs" on public.farm_jobs;
 drop policy if exists "Users can delete their own farm jobs" on public.farm_jobs;
 drop policy if exists "Public can read farm jobs" on public.farm_jobs;
 drop policy if exists "Only owner can create farm jobs" on public.farm_jobs;
 drop policy if exists "Only owner can update farm jobs" on public.farm_jobs;
 drop policy if exists "Only owner can delete farm jobs" on public.farm_jobs;

create policy "Public can read farm jobs" on public.farm_jobs
  for select to anon, authenticated using (true);
create policy "Only owner can create farm jobs" on public.farm_jobs
  for insert to authenticated
  with check (auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and owner_id = auth.uid());
create policy "Only owner can update farm jobs" on public.farm_jobs
  for update to authenticated
  using (auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and owner_id = auth.uid())
  with check (auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and owner_id = auth.uid());
create policy "Only owner can delete farm jobs" on public.farm_jobs
  for delete to authenticated
  using (auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and owner_id = auth.uid());

drop policy if exists "Users can read their own farm job updates" on public.farm_job_updates;
drop policy if exists "Users can create their own farm job updates" on public.farm_job_updates;
drop policy if exists "Users can update their own farm job updates" on public.farm_job_updates;
drop policy if exists "Users can delete their own farm job updates" on public.farm_job_updates;
drop policy if exists "Public can read farm job updates" on public.farm_job_updates;
drop policy if exists "Only owner can create farm job updates" on public.farm_job_updates;
drop policy if exists "Only owner can update farm job updates" on public.farm_job_updates;
drop policy if exists "Only owner can delete farm job updates" on public.farm_job_updates;

create policy "Public can read farm job updates" on public.farm_job_updates
  for select to anon, authenticated using (true);
create policy "Only owner can create farm job updates" on public.farm_job_updates
  for insert to authenticated with check (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );
create policy "Only owner can update farm job updates" on public.farm_job_updates
  for update to authenticated using (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );
create policy "Only owner can delete farm job updates" on public.farm_job_updates
  for delete to authenticated using (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
commit;
