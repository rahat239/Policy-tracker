-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  plan text default 'free' check (plan in ('free','pro','enterprise')),
  email_alerts boolean default true,
  created_at timestamptz default now()
);

-- Monitors table
create table if not exists monitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  url text not null,
  label text,
  check_interval text default 'daily' check (check_interval in ('15min','hourly','daily','weekly')),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_content_hash text,
  status text default 'active' check (status in ('active','paused')),
  created_at timestamptz default now()
);

-- Snapshots table (stores page content history)
create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid references monitors(id) on delete cascade,
  content text,
  content_hash text,
  captured_at timestamptz default now()
);

-- Changes table (stores detected diffs)
create table if not exists changes (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid references monitors(id) on delete cascade,
  diff_text text,
  lines_added integer default 0,
  lines_removed integer default 0,
  snapshot_before uuid references snapshots(id),
  snapshot_after uuid references snapshots(id),
  detected_at timestamptz default now(),
  seen boolean default false
);

-- Indexes for performance
create index if not exists monitors_user_id_idx on monitors(user_id);
create index if not exists snapshots_monitor_id_idx on snapshots(monitor_id);
create index if not exists changes_monitor_id_idx on changes(monitor_id);
create index if not exists changes_detected_at_idx on changes(detected_at desc);

-- Row Level Security
alter table users enable row level security;
alter table monitors enable row level security;
alter table snapshots enable row level security;
alter table changes enable row level security;

-- Policies (service role bypasses these, used for direct API access)
create policy "users can read own data" on users for select using (auth.uid()::text = id::text);
create policy "users can manage own monitors" on monitors for all using (user_id = (select id from users where id::text = auth.uid()::text));
