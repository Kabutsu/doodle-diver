-- Create leaderboard table
create table if not exists leaderboard (
  id uuid default gen_random_uuid() primary key,
  player varchar(64) not null,
  score bigint not null,
  depth integer,
  run_time_ms integer,
  palette text,
  masks_used jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_leaderboard_score on leaderboard (score desc);