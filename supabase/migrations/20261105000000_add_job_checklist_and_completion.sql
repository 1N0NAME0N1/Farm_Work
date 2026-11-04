alter table public.farm_jobs
  add column if not exists service text not null default 'custom' check (service in ('custom', 'account_care')),
  add column if not exists checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  add column if not exists completed_at timestamptz;

update public.farm_jobs
set completed_at = updated_at
where status = 'completed' and completed_at is null;
