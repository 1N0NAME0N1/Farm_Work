alter table public.farm_jobs
  drop constraint if exists farm_jobs_service_check,
  drop column if exists checklist,
  add column if not exists duration_days integer not null default 0 check (duration_days >= 0),
  add constraint farm_jobs_service_check check (service in ('gem_farm', 'account_care'));
