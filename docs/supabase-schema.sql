create table if not exists public.locations (
  id text primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  population_density numeric not null,
  energy_demand numeric not null,
  traffic_score numeric not null,
  grid_readiness numeric not null,
  ev_adoption_score numeric not null,
  roi_estimate numeric not null default 0,
  recommendation_summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists locations_created_at_idx
  on public.locations (created_at desc);
