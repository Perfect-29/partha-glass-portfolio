begin;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users owner to postgres;
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

alter function public.is_portfolio_admin() owner to postgres;

create or replace function public.is_jsonb_string_array(value jsonb, max_items integer)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) is distinct from 'array' or max_items is null or max_items < 0
      then false
    else jsonb_array_length(value) <= max_items
      and not exists (
        select 1
        from jsonb_array_elements(value) as element(item)
        where jsonb_typeof(element.item) is distinct from 'string'
      )
  end;
$$;

revoke all on function public.is_jsonb_string_array(jsonb, integer) from public;
grant execute on function public.is_jsonb_string_array(jsonb, integer) to anon, authenticated;

create or replace function public.is_valid_portfolio_stats(value jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) is distinct from 'array' then false
    else jsonb_array_length(value) <= 100
      and not exists (
        select 1
        from jsonb_array_elements(value) as stat(item)
        where jsonb_typeof(stat.item) is distinct from 'object'
          or not (stat.item ?& array['id', 'value', 'suffix', 'label'])
          or stat.item - array['id', 'value', 'suffix', 'label'] <> '{}'::jsonb
          or jsonb_typeof(stat.item->'id') is distinct from 'string'
          or jsonb_typeof(stat.item->'value') is distinct from 'number'
          or jsonb_typeof(stat.item->'suffix') is distinct from 'string'
          or jsonb_typeof(stat.item->'label') is distinct from 'string'
      )
  end;
$$;

revoke all on function public.is_valid_portfolio_stats(jsonb) from public;
grant execute on function public.is_valid_portfolio_stats(jsonb) to anon, authenticated;

create or replace function public.touch_portfolio_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    if new.published and new.published_at is null then
      new.published_at := now();
    end if;
  elsif new.published and old.published is distinct from new.published then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create table public.profile (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique default 'main' check (record_id = 'main'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  site jsonb not null check (
    jsonb_typeof(site) = 'object'
    and site ?& array['name', 'role', 'email', 'emailPlaceholder']
    and site - array['name', 'role', 'email', 'emailPlaceholder'] = '{}'::jsonb
    and jsonb_typeof(site->'name') = 'string'
    and char_length(site->>'name') <= 120
    and jsonb_typeof(site->'role') = 'string'
    and char_length(site->>'role') <= 160
    and jsonb_typeof(site->'email') = 'string'
    and char_length(site->>'email') <= 254
    and jsonb_typeof(site->'emailPlaceholder') = 'string'
    and char_length(site->>'emailPlaceholder') <= 200
  ),
  hero jsonb not null check (
    jsonb_typeof(hero) = 'object'
    and hero ?& array[
      'eyebrow', 'headline', 'roles', 'tagline', 'primaryButton',
      'secondaryButton', 'image', 'imageAlt', 'imagePosition'
    ]
    and hero - array[
      'eyebrow', 'headline', 'roles', 'tagline', 'primaryButton',
      'secondaryButton', 'image', 'imageAlt', 'imagePosition'
    ] = '{}'::jsonb
    and jsonb_typeof(hero->'eyebrow') = 'string'
    and char_length(hero->>'eyebrow') <= 200
    and jsonb_typeof(hero->'headline') = 'string'
    and char_length(hero->>'headline') <= 200
    and jsonb_typeof(hero->'roles') = 'array'
    and jsonb_array_length(hero->'roles') = 2
    and jsonb_typeof(hero->'roles'->0) = 'string'
    and jsonb_typeof(hero->'roles'->1) = 'string'
    and jsonb_typeof(hero->'tagline') = 'string'
    and char_length(hero->>'tagline') <= 500
    and jsonb_typeof(hero->'primaryButton') = 'string'
    and char_length(hero->>'primaryButton') <= 100
    and jsonb_typeof(hero->'secondaryButton') = 'string'
    and char_length(hero->>'secondaryButton') <= 100
    and jsonb_typeof(hero->'image') = 'string'
    and char_length(hero->>'image') <= 2048
    and jsonb_typeof(hero->'imageAlt') = 'string'
    and char_length(hero->>'imageAlt') <= 300
    and jsonb_typeof(hero->'imagePosition') = 'string'
    and char_length(hero->>'imagePosition') <= 100
  ),
  about jsonb not null check (
    jsonb_typeof(about) = 'object'
    and about ?& array[
      'eyebrow', 'portrait', 'portraitAlt', 'paragraphs',
      'technologies', 'focus'
    ]
    and about - array[
      'eyebrow', 'portrait', 'portraitAlt', 'paragraphs',
      'technologies', 'focus'
    ] = '{}'::jsonb
    and jsonb_typeof(about->'eyebrow') = 'string'
    and char_length(about->>'eyebrow') <= 200
    and jsonb_typeof(about->'portrait') = 'string'
    and char_length(about->>'portrait') <= 2048
    and jsonb_typeof(about->'portraitAlt') = 'string'
    and char_length(about->>'portraitAlt') <= 300
    and public.is_jsonb_string_array(about->'paragraphs', 20)
    and public.is_jsonb_string_array(about->'technologies', 100)
    and public.is_jsonb_string_array(about->'focus', 50)
  )
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) <= 200),
  category text not null check (char_length(category) <= 160),
  subtitle text not null check (char_length(subtitle) <= 200),
  status text not null check (status in ('Completed', 'In Development', 'Concept', 'Academic Project')),
  video_url text check (video_url is null or (char_length(video_url) <= 2048 and video_url ~ '^https?://[^[:space:]]+$')),
  embed_url text check (embed_url is null or (char_length(embed_url) <= 2048 and embed_url ~ '^https?://[^[:space:]]+$')),
  drive_url text check (drive_url is null or (char_length(drive_url) <= 2048 and drive_url ~ '^https?://[^[:space:]]+$')),
  live_url text check (live_url is null or (char_length(live_url) <= 2048 and live_url ~ '^https?://[^[:space:]]+$')),
  repo_url text check (repo_url is null or (char_length(repo_url) <= 2048 and repo_url ~ '^https?://[^[:space:]]+$')),
  kind text check (kind is null or kind in ('video', 'software')),
  poster text check (poster is null or char_length(poster) <= 2048),
  description text check (description is null or char_length(description) <= 5000),
  tags text[] check (tags is null or cardinality(tags) <= 100),
  problem text check (problem is null or char_length(problem) <= 5000),
  objectives text[] check (objectives is null or cardinality(objectives) <= 100),
  solution text check (solution is null or char_length(solution) <= 5000),
  implementation text check (implementation is null or char_length(implementation) <= 5000),
  features text[] check (features is null or cardinality(features) <= 100),
  applications text[] check (applications is null or cardinality(applications) <= 100)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) <= 160),
  category text not null check (char_length(category) <= 120),
  level text not null check (char_length(level) <= 80)
);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  degree text not null check (char_length(degree) <= 240),
  institution text not null check (char_length(institution) <= 240),
  period text not null check (char_length(period) <= 120),
  status text not null check (char_length(status) <= 120)
);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) <= 240),
  description text not null check (char_length(description) <= 5000)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  issuer text not null check (char_length(issuer) between 1 and 240),
  date text not null check (char_length(date) between 1 and 120),
  description text not null check (char_length(description) between 1 and 5000),
  certificate_url text check (certificate_url is null or certificate_url = '' or (char_length(certificate_url) <= 2048 and certificate_url ~ '^https?://[^[:space:]]+$')),
  organization text check (organization is null or char_length(organization) <= 240),
  category text check (category is null or char_length(category) <= 120),
  proof_url text check (proof_url is null or proof_url = '' or (char_length(proof_url) <= 2048 and proof_url ~ '^https?://[^[:space:]]+$')),
  featured boolean,
  credential_id text check (credential_id is null or char_length(credential_id) <= 240),
  credential_url text check (credential_url is null or credential_url = '' or (char_length(credential_url) <= 2048 and credential_url ~ '^https?://[^[:space:]]+$')),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint check (file_size is null or file_size between 0 and 15728639)
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  organization text not null check (char_length(organization) between 1 and 240),
  issue_date text not null check (char_length(issue_date) between 1 and 120),
  category text not null check (char_length(category) between 1 and 120),
  credential_id text not null check (char_length(credential_id) <= 240),
  credential_url text not null check (credential_url = '' or (char_length(credential_url) <= 2048 and credential_url ~ '^https?://[^[:space:]]+$')),
  certificate_url text not null check (char_length(certificate_url) <= 2048 and certificate_url ~ '^https?://[^[:space:]]+$'),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint check (file_size is null or file_size between 0 and 15728639)
);

create table public.internships (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  company text not null check (char_length(company) between 1 and 240),
  role text not null check (char_length(role) between 1 and 240),
  duration text not null check (char_length(duration) between 1 and 120),
  start_date text not null check (char_length(start_date) <= 120),
  end_date text not null check (char_length(end_date) <= 120),
  description text not null check (char_length(description) between 1 and 5000),
  skills text[] not null check (cardinality(skills) <= 100),
  certificate_url text not null check (char_length(certificate_url) <= 2048 and certificate_url ~ '^https?://[^[:space:]]+$'),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint check (file_size is null or file_size between 0 and 15728639)
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  institution text not null check (char_length(institution) between 1 and 240),
  date text not null check (char_length(date) between 1 and 120),
  description text not null check (char_length(description) between 1 and 5000),
  certificate_url text not null check (certificate_url = '' or (char_length(certificate_url) <= 2048 and certificate_url ~ '^https?://[^[:space:]]+$')),
  image_url text not null check (image_url = '' or (char_length(image_url) <= 2048 and image_url ~ '^https?://[^[:space:]]+$')),
  url text not null check (url = '' or (char_length(url) <= 2048 and url ~ '^https?://[^[:space:]]+$')),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type in ('application/pdf', 'image/jpeg', 'image/png')),
  file_size bigint check (file_size is null or file_size between 0 and 15728639),
  certificate_file_name text check (certificate_file_name is null or char_length(certificate_file_name) <= 240),
  certificate_file_type text check (certificate_file_type is null or certificate_file_type in ('application/pdf', 'image/jpeg', 'image/png')),
  certificate_file_size bigint check (certificate_file_size is null or certificate_file_size between 0 and 15728639),
  image_file_name text check (image_file_name is null or char_length(image_file_name) <= 240),
  image_file_type text check (image_file_type is null or image_file_type in ('image/jpeg', 'image/png')),
  image_file_size bigint check (image_file_size is null or image_file_size between 0 and 10485759)
);

create table public.coding_profiles (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  platform text not null check (char_length(platform) between 1 and 120),
  username text not null check (char_length(username) between 1 and 160),
  profile_url text not null check (char_length(profile_url) <= 2048 and profile_url ~ '^https?://[^[:space:]]+$')
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  abstract text not null check (char_length(abstract) between 1 and 10000),
  publication_date text not null check (char_length(publication_date) between 1 and 120),
  venue text not null check (char_length(venue) between 1 and 240),
  doi text not null check (char_length(doi) <= 500),
  publication_url text not null check (publication_url = '' or (char_length(publication_url) <= 2048 and publication_url ~ '^https?://[^[:space:]]+$')),
  pdf_url text not null check (pdf_url = '' or (char_length(pdf_url) <= 2048 and pdf_url ~ '^https?://[^[:space:]]+$')),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type = 'application/pdf'),
  file_size bigint check (file_size is null or file_size between 0 and 15728639)
);

create table public.resume (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 240),
  file_url text not null check (char_length(file_url) <= 2048 and file_url ~ '^https?://[^[:space:]]+$'),
  uploaded_at text not null check (char_length(uploaded_at) between 1 and 120),
  file_name text check (file_name is null or char_length(file_name) <= 240),
  file_type text check (file_type is null or file_type = 'application/pdf'),
  file_size bigint check (file_size is null or file_size between 0 and 15728639)
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique check (record_id ~ '^[A-Za-z0-9_-]+$'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  label text not null check (char_length(label) <= 120),
  href text not null check (
    href = ''
    or (
      char_length(href) <= 2048
      and href ~ '^https?://[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
    )
  )
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique default 'main' check (record_id = 'main'),
  display_order integer not null default 0 check (display_order >= 0),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  schema_version integer not null check (schema_version = 1),
  page_title text not null check (char_length(page_title) <= 240),
  loader jsonb not null check (
    jsonb_typeof(loader) = 'object'
    and loader ?& array['statement', 'redWords']
    and loader - array['statement', 'redWords'] = '{}'::jsonb
    and jsonb_typeof(loader->'statement') = 'string'
    and char_length(loader->>'statement') <= 500
    and jsonb_typeof(loader->'redWords') = 'array'
    and jsonb_array_length(loader->'redWords') <= 50
  ),
  tech_stack text[] not null check (cardinality(tech_stack) <= 100),
  stats jsonb not null check (public.is_valid_portfolio_stats(stats)),
  resume_url text not null check (char_length(resume_url) <= 2048)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120 and name = btrim(name)),
  email text not null check (
    char_length(email) between 1 and 254
    and email = btrim(email)
    and email ~ '^[A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+([.][A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
  ),
  message text not null check (char_length(message) between 1 and 5000 and message = btrim(message)),
  status text not null default 'unread' check (status in ('unread', 'read')),
  created_at timestamptz not null default now()
);

create or replace function public.set_contact_message_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create index profile_published_order_idx on public.profile (published, display_order);
create index projects_published_order_idx on public.projects (published, display_order);
create index skills_published_order_idx on public.skills (published, display_order);
create index education_published_order_idx on public.education (published, display_order);
create index experience_published_order_idx on public.experience (published, display_order);
create index achievements_published_order_idx on public.achievements (published, display_order);
create index certifications_published_order_idx on public.certifications (published, display_order);
create index internships_published_order_idx on public.internships (published, display_order);
create index workshops_published_order_idx on public.workshops (published, display_order);
create index coding_profiles_published_order_idx on public.coding_profiles (published, display_order);
create index publications_published_order_idx on public.publications (published, display_order);
create index resume_published_order_idx on public.resume (published, display_order);
create index social_links_published_order_idx on public.social_links (published, display_order);
create index site_settings_published_order_idx on public.site_settings (published, display_order);
create index messages_created_at_idx on public.messages (created_at desc);

do $$
declare
  table_name text;
  portfolio_tables text[] := array[
    'profile', 'projects', 'skills', 'education', 'experience',
    'achievements', 'certifications', 'internships', 'workshops',
    'coding_profiles', 'publications', 'resume', 'social_links', 'site_settings'
  ];
begin
  foreach table_name in array portfolio_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (published)',
      table_name || '_public_read_published',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin())',
      table_name || '_admin_manage',
      table_name
    );
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on public.%I to authenticated', table_name);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.touch_portfolio_record()',
      table_name || '_touch_updated_at',
      table_name
    );
  end loop;
end;
$$;

alter table public.messages enable row level security;
create trigger messages_set_created_at
  before insert on public.messages
  for each row execute function public.set_contact_message_timestamp();
create policy messages_public_submit on public.messages
  for insert to anon, authenticated
  with check (
    status = 'unread'
    and char_length(name) between 1 and 120
    and name = btrim(name)
    and char_length(email) between 1 and 254
    and email = btrim(email)
    and email ~ '^[A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+([.][A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
    and char_length(message) between 1 and 5000
    and message = btrim(message)
  );
create policy messages_admin_read on public.messages
  for select to authenticated using (public.is_portfolio_admin());
create policy messages_admin_update on public.messages
  for update to authenticated using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());
create policy messages_admin_delete on public.messages
  for delete to authenticated using (public.is_portfolio_admin());
revoke all on public.messages from public, anon, authenticated;
grant insert (name, email, message, status) on public.messages to anon, authenticated;
grant select, delete on public.messages to authenticated;
grant update (status) on public.messages to authenticated;

commit;
