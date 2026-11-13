drop trigger farm_jobs_sync_legacy_updates on public.farm_jobs;
drop function public.sync_legacy_farm_job_updates();
alter table public.farm_jobs drop column updates;

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

  update public.farm_jobs
  set status = p_status,
      completed_at = p_completed_at,
      updated_at = now()
  where id = p_job_id;
end;
$$;

notify pgrst, 'reload schema';
