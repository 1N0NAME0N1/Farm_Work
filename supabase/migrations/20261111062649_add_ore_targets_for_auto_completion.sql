alter table public.farm_jobs
  add column if not exists ore_targets jsonb not null default '{}'::jsonb,
  add constraint farm_jobs_ore_targets_check check (jsonb_typeof(ore_targets) = 'object'),
  add constraint farm_jobs_ore_target_keys_check check (service <> 'ore_farm' or ore_targets = '{}'::jsonb or (ore_targets ?& ore_types and ore_targets - ore_types = '{}'::jsonb));
