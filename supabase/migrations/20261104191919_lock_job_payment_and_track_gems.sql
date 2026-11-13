alter table public.farm_jobs
  add column if not exists target_gems integer not null default 0 check (target_gems >= 0),
  add column if not exists agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0);

create or replace function public.prevent_farm_job_agreed_amount_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.agreed_amount is distinct from old.agreed_amount then
    raise exception 'Agreed job payment cannot be changed after creation';
  end if;
  return new;
end;
$$;

drop trigger if exists farm_jobs_agreed_amount_immutable on public.farm_jobs;
create trigger farm_jobs_agreed_amount_immutable
  before update of agreed_amount on public.farm_jobs
  for each row execute function public.prevent_farm_job_agreed_amount_change();
