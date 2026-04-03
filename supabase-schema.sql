-- Supabase SQL Editor에서 실행

create table game_state (
  id int primary key default 1,
  total_chips jsonb default '[0,0,0,0,0,0]',
  today_chips jsonb default '[0,0,0,0,0,0]',
  today_games int default 0,
  today_pw int default 0,
  today_ew int default 0,
  pirates_w int default 0,
  pirates_l int default 0,
  explore_w int default 0,
  explore_l int default 0,
  personal jsonb default '[{"pw":0,"pl":0,"ew":0,"el":0},{"pw":0,"pl":0,"ew":0,"el":0},{"pw":0,"pl":0,"ew":0,"el":0},{"pw":0,"pl":0,"ew":0,"el":0},{"pw":0,"pl":0,"ew":0,"el":0},{"pw":0,"pl":0,"ew":0,"el":0}]',
  combo_stats jsonb default '{}',
  total_rounds int default 0,
  gold_amount int default 0,
  today_in int default 0,
  today_out int default 0,
  fine_paid jsonb default '[false,false,false,false,false,false]',
  updated_at timestamptz default now()
);

create table game_log (
  id serial primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

create table gold_log (
  id serial primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

-- 초기 상태 삽입
insert into game_state (id) values (1);

-- RLS 비활성화
alter table game_state disable row level security;
alter table game_log disable row level security;
alter table gold_log disable row level security;
