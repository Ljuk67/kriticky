-- Comments table expected columns (create or alter accordingly)
-- Note: adjust types/names if your existing table differs.

-- Create table (if not exists)
-- create table public.comments (
--   id uuid primary key default gen_random_uuid(),
--   slug text not null,
--   name text not null,
--   email text not null,
--   message text not null,
--   is_approved boolean not null default false,
--   verify_token text,
--   verify_expires_at timestamptz,
--   verified_at timestamptz,
--   created_at timestamptz not null default now()
-- );

-- If table already exists, add missing columns
-- alter table public.comments add column if not exists is_approved boolean not null default false;
-- alter table public.comments add column if not exists verify_token text;
-- alter table public.comments add column if not exists verify_expires_at timestamptz;
-- alter table public.comments add column if not exists verified_at timestamptz;

-- RLS suggestions
-- enable row level security on table public.comments;
-- revoke insert on public.comments from anon, authenticated;
-- grant select on public.comments to anon; -- list only approved rows via policy
-- create policy comments_select_approved on public.comments
--   for select using (is_approved = true);

