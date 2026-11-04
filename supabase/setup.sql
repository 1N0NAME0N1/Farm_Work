create table if not exists public.farm_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game text not null check (game in ('genshin', 'wuwa')),
  title text not null check (char_length(title) between 1 and 80),
  client text not null default '' check (char_length(client) <= 60),
  status text not null default 'active' check (status in ('active', 'completed')),
  service text not null default 'custom' check (service in ('custom', 'account_care')),
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  target_gems integer not null default 0 check (target_gems >= 0),
  agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0),
  completed_at timestamptz,
  job_date date not null,
  updates jsonb not null default '[]'::jsonb check (jsonb_typeof(updates) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farm_jobs enable row level security;
revoke all on public.farm_jobs from anon;
grant select, insert, update, delete on public.farm_jobs to authenticated;

create policy "Users can read their own farm jobs"
  on public.farm_jobs for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own farm jobs"
  on public.farm_jobs for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own farm jobs"
  on public.farm_jobs for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own farm jobs"
  on public.farm_jobs for delete to authenticated
  using ((select auth.uid()) = owner_id);

create index if not exists farm_jobs_owner_updated_idx
  on public.farm_jobs (owner_id, updated_at desc);

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
