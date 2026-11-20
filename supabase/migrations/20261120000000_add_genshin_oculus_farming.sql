create or replace function public.has_positive_integer_targets(p_targets jsonb, p_types text[])
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(bool_and(
    case when jsonb_typeof(p_targets -> selected.type) = 'number' then
      (p_targets ->> selected.type)::numeric >= 1
      and trunc((p_targets ->> selected.type)::numeric) = (p_targets ->> selected.type)::numeric
    else false end
  ), false)
  from unnest(p_types) as selected(type);
$$;

alter table public.farm_jobs
  drop constraint if exists farm_jobs_service_check,
  add constraint farm_jobs_service_check check (service in ('gem_farm', 'ore_farm', 'oculus_farm', 'world_quest', 'story_quest', 'account_care')),
  add column oculus_types text[] not null default '{}'::text[],
  add column oculus_targets jsonb not null default '{}'::jsonb check (jsonb_typeof(oculus_targets) = 'object'),
  add constraint farm_jobs_oculus_types_check check (oculus_types <@ array['anemoculus', 'geoculus', 'electroculus', 'dendroculus', 'hydroculus', 'pyroculus', 'cryoculus', 'lunoculus']::text[]),
  add constraint farm_jobs_oculus_target_values_check check (
    (service = 'oculus_farm' and oculus_targets ?& oculus_types and oculus_targets - oculus_types = '{}'::jsonb and public.has_positive_integer_targets(oculus_targets, oculus_types))
    or (service <> 'oculus_farm' and oculus_targets = '{}'::jsonb)
  ),
  add constraint farm_jobs_oculus_farm_check check (
    (service = 'oculus_farm' and game = 'genshin' and cardinality(oculus_types) > 0)
    or (service <> 'oculus_farm' and cardinality(oculus_types) = 0)
  );

notify pgrst, 'reload schema';
