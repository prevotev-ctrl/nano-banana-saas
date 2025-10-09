-- WARNING: This schema is for context only and is not meant to be run blindly in production.
-- Review and adapt to your environment/policies.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid not null default gen_random_uuid(),
  created_at timestamp without time zone default now(),
  input_image_url text not null,
  output_image_url text,
  prompt text not null,
  status text default 'processing'::text,
  constraint projects_pkey primary key (id)
);

create table if not exists public.waitlist (
  id uuid not null default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@]+@[^@]+\.[^@]+$'::text),
  created_at timestamp with time zone default now(),
  constraint waitlist_pkey primary key (id)
);

-- Storage buckets expected:
-- input-images (public)
-- output-images (public)

--
-- RLS policies (recommended)
--
-- Note: Supabase enables RLS by default. Storage uses the table `storage.objects`
-- and requires explicit policies per bucket. The client upload in app/page.jsx
-- uses the anon key, so you need at least INSERT/UPDATE on `input-images` and
-- public SELECT to read images. The server route uses the service role and
-- bypasses RLS for `projects` and writing to `output-images`.

-- Storage policies for input-images
create policy if not exists "Public read input-images"
on storage.objects for select
to anon
using (bucket_id = 'input-images');

create policy if not exists "Public upload input-images"
on storage.objects for insert
to anon
with check (bucket_id = 'input-images');

create policy if not exists "Public update input-images"
on storage.objects for update
to anon
using (bucket_id = 'input-images')
with check (bucket_id = 'input-images');

-- Storage policies for output-images (reads only; writes happen server-side)
create policy if not exists "Public read output-images"
on storage.objects for select
to anon
using (bucket_id = 'output-images');

-- Optional: Table policies if you want to allow public inserts (not required when using service role)
alter table public.projects enable row level security;
alter table public.waitlist enable row level security;

-- Allow anyone (anon and authenticated) to add to waitlist
create policy if not exists "Public insert waitlist"
on public.waitlist for insert
to anon, authenticated
with check (true);

-- If you ever need to allow reading waitlist rows (generally avoid exposing emails):
-- create policy if not exists "Public select waitlist" on public.waitlist for select to authenticated using (true);

-- If you intend to create projects from the client (not recommended), uncomment this:
-- create policy if not exists "Public insert projects" on public.projects for insert to anon with check (true);
-- create policy if not exists "Public update projects" on public.projects for update to anon using (true) with check (true);
