-- Move agreed payments into the owner-only table, preserving existing values.
begin;

alter table public.farm_job_private
  add column agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0);

update public.farm_job_private private
set agreed_amount = job.agreed_amount
from public.farm_jobs job
where job.id = private.job_id;

drop trigger if exists farm_jobs_agreed_amount_immutable on public.farm_jobs;
alter table public.farm_jobs drop column agreed_amount;

create trigger farm_jobs_agreed_amount_immutable
  before update of agreed_amount on public.farm_job_private
  for each row execute function public.prevent_farm_job_agreed_amount_change();

notify pgrst, 'reload schema';
commit;
