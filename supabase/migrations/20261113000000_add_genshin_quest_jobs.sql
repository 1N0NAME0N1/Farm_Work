alter table public.farm_jobs
  drop constraint if exists farm_jobs_service_check,
  add constraint farm_jobs_service_check check (service in ('gem_farm', 'ore_farm', 'world_quest', 'story_quest', 'account_care')),
  add column if not exists target_quests integer not null default 0 check (target_quests >= 0),
  add constraint farm_jobs_quest_check check (((service in ('world_quest', 'story_quest')) and game = 'genshin' and target_quests > 0) or (service not in ('world_quest', 'story_quest') and target_quests = 0));
