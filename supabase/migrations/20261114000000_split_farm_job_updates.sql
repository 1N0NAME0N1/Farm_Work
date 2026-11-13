create table public.farm_job_updates (
  job_id uuid not null references public.farm_jobs(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  report_date date not null,
  entry jsonb not null check (jsonb_typeof(entry) = 'object'),
  created_at timestamptz not null default now(),
  primary key (job_id, sequence)
);

alter table public.farm_job_updates enable row level security;
revoke all on public.farm_job_updates from anon;
grant select, insert, update, delete on public.farm_job_updates to authenticated;

create policy "Users can read their own farm job updates"
  on public.farm_job_updates for select to authenticated
  using (exists (
    select 1 from public.farm_jobs job
    where job.id = job_id and job.owner_id = (select auth.uid())
  ));
create policy "Users can create their own farm job updates"
  on public.farm_job_updates for insert to authenticated
  with check (exists (
    select 1 from public.farm_jobs job
    where job.id = job_id and job.owner_id = (select auth.uid())
  ));
create policy "Users can update their own farm job updates"
  on public.farm_job_updates for update to authenticated
  using (exists (
    select 1 from public.farm_jobs job
    where job.id = job_id and job.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.farm_jobs job
    where job.id = job_id and job.owner_id = (select auth.uid())
  ));
create policy "Users can delete their own farm job updates"
  on public.farm_job_updates for delete to authenticated
  using (exists (
    select 1 from public.farm_jobs job
    where job.id = job_id and job.owner_id = (select auth.uid())
  ));

create index farm_job_updates_report_date_idx
  on public.farm_job_updates (job_id, report_date desc);

insert into public.farm_job_updates (job_id, sequence, report_date, entry)
select job.id, (report.ordinality - 1)::integer,
       (report.entry ->> 'date')::date, report.entry
from public.farm_jobs job
cross join lateral jsonb_array_elements(job.updates) with ordinality as report(entry, ordinality)
order by job.id, report.ordinality;

create or replace function public.sync_legacy_farm_job_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.farm_job_updates where job_id = new.id;
  insert into public.farm_job_updates (job_id, sequence, report_date, entry)
  select new.id, (report.ordinality - 1)::integer,
         (report.entry ->> 'date')::date, report.entry
  from jsonb_array_elements(new.updates) with ordinality as report(entry, ordinality);
  return new;
end;
$$;

create trigger farm_jobs_sync_legacy_updates
  after insert or update of updates on public.farm_jobs
  for each row execute function public.sync_legacy_farm_job_updates();

create or replace function public.record_farm_job_update(
  p_job_id uuid,
  p_entry jsonb,
  p_status text,
  p_completed_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_sequence integer;
  all_updates jsonb;
begin
  if jsonb_typeof(p_entry) <> 'object' or nullif(p_entry ->> 'date', '') is null then
    raise exception 'A daily report with a date is required';
  end if;
  if p_status not in ('active', 'completed') then
    raise exception 'Invalid farm job status';
  end if;

  perform 1 from public.farm_jobs where id = p_job_id for update;
  if not found then
    raise exception 'Farm job not found';
  end if;

  select coalesce(max(sequence) + 1, 0) into next_sequence
  from public.farm_job_updates where job_id = p_job_id;
  insert into public.farm_job_updates (job_id, sequence, report_date, entry)
  values (p_job_id, next_sequence, (p_entry ->> 'date')::date, p_entry);

  select jsonb_agg(entry order by sequence) into all_updates
  from public.farm_job_updates where job_id = p_job_id;
  update public.farm_jobs
  set updates = coalesce(all_updates, '[]'::jsonb),
      status = p_status,
      completed_at = p_completed_at,
      updated_at = now()
  where id = p_job_id;
end;
$$;

revoke all on function public.record_farm_job_update(uuid, jsonb, text, timestamptz) from public, anon;
grant execute on function public.record_farm_job_update(uuid, jsonb, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
