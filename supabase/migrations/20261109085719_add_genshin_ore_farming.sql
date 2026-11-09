alter table public.farm_jobs
  drop constraint if exists farm_jobs_service_check,
  add constraint farm_jobs_service_check check (service in ('gem_farm', 'ore_farm', 'account_care')),
  add column if not exists ore_types text[] not null default '{}'::text[],
  add constraint farm_jobs_ore_types_check check (ore_types <@ array['iron_chunk', 'white_iron_chunk', 'crystal_chunk', 'magical_crystal_chunk', 'amethyst_lump', 'starsilver', 'condessence_crystal']::text[]),
  add constraint farm_jobs_ore_farm_check check ((service = 'ore_farm' and game = 'genshin' and cardinality(ore_types) > 0) or (service <> 'ore_farm' and cardinality(ore_types) = 0));
