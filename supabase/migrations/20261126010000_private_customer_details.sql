-- Move customer identity and conditions behind owner-only row-level security.
begin;

create table public.farm_job_private (
  job_id uuid primary key references public.farm_jobs(id) on delete cascade,
  client text not null default '' check (char_length(client) <= 60),
  customer_conditions text not null default '' check (char_length(customer_conditions) <= 1000)
);

insert into public.farm_job_private (job_id, client, customer_conditions)
select id, client, customer_conditions from public.farm_jobs;

alter table public.farm_job_private enable row level security;
revoke all on public.farm_job_private from anon;
grant select, insert, update, delete on public.farm_job_private to authenticated;
grant select on public.farm_job_private to anon;

create policy "Only owner can read private farm job details" on public.farm_job_private
  for select to authenticated using (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );
create policy "Only owner can create private farm job details" on public.farm_job_private
  for insert to authenticated with check (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );
create policy "Only owner can update private farm job details" on public.farm_job_private
  for update to authenticated using (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  ) with check (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );
create policy "Only owner can delete private farm job details" on public.farm_job_private
  for delete to authenticated using (
    auth.uid() = '366b259b-dd59-43ac-8b40-caade4a46a63'::uuid and exists (
      select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = auth.uid()
    )
  );

alter table public.farm_jobs drop column client, drop column customer_conditions;
notify pgrst, 'reload schema';
commit;
