create table if not exists public.farm_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  game text not null check (game in ('genshin', 'wuwa')),
  title text not null check (char_length(title) between 1 and 80),
  client text not null default '' check (char_length(client) <= 60),
  customer_conditions text not null default '' check (char_length(customer_conditions) <= 1000),
  status text not null default 'active' check (status in ('active', 'completed')),
  service text not null default 'gem_farm' check (service in ('gem_farm', 'ore_farm', 'world_quest', 'story_quest', 'account_care')),
  duration_days integer not null default 0 check (duration_days >= 0),
  target_gems integer not null default 0 check (target_gems >= 0),
  target_quests integer not null default 0 check (target_quests >= 0),
  ore_types text[] not null default '{}'::text[],
  ore_targets jsonb not null default '{}'::jsonb check (jsonb_typeof(ore_targets) = 'object'),
  agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0),
  completed_at timestamptz,
  job_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_jobs_ore_types_check check (ore_types <@ array['iron_chunk', 'white_iron_chunk', 'crystal_chunk', 'magical_crystal_chunk', 'amethyst_lump', 'starsilver', 'condessence_crystal']::text[]),
  constraint farm_jobs_quest_check check (((service in ('world_quest', 'story_quest')) and game = 'genshin' and target_quests > 0) or (service not in ('world_quest', 'story_quest') and target_quests = 0)),
  constraint farm_jobs_ore_target_keys_check check (service <> 'ore_farm' or ore_targets = '{}'::jsonb or (ore_targets ?& ore_types and ore_targets - ore_types = '{}'::jsonb)),
  constraint farm_jobs_ore_farm_check check ((service = 'ore_farm' and game = 'genshin' and cardinality(ore_types) > 0) or (service <> 'ore_farm' and cardinality(ore_types) = 0))
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

create table if not exists public.farm_job_updates (
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
  using (exists (select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = (select auth.uid())));
create policy "Users can create their own farm job updates"
  on public.farm_job_updates for insert to authenticated
  with check (exists (select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = (select auth.uid())));
create policy "Users can update their own farm job updates"
  on public.farm_job_updates for update to authenticated
  using (exists (select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = (select auth.uid())));
create policy "Users can delete their own farm job updates"
  on public.farm_job_updates for delete to authenticated
  using (exists (select 1 from public.farm_jobs job where job.id = job_id and job.owner_id = (select auth.uid())));

create index if not exists farm_job_updates_report_date_idx
  on public.farm_job_updates (job_id, report_date desc);

create or replace function public.record_farm_job_update(
  p_job_id uuid, p_entry jsonb, p_status text, p_completed_at timestamptz
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
  if not found then raise exception 'Farm job not found'; end if;
  select coalesce(max(sequence) + 1, 0) into next_sequence
  from public.farm_job_updates where job_id = p_job_id;
  insert into public.farm_job_updates (job_id, sequence, report_date, entry)
  values (p_job_id, next_sequence, (p_entry ->> 'date')::date, p_entry);
  update public.farm_jobs
  set status = p_status, completed_at = p_completed_at, updated_at = now()
  where id = p_job_id;
end;
$$;

revoke all on function public.record_farm_job_update(uuid, jsonb, text, timestamptz) from public, anon;
grant execute on function public.record_farm_job_update(uuid, jsonb, text, timestamptz) to authenticated;

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
