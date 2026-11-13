alter table public.farm_jobs
  add column if not exists customer_conditions text not null default ''
  check (char_length(customer_conditions) <= 1000);
