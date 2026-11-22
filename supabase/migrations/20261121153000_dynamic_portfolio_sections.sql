begin;

create table if not exists public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  section_name text not null check (char_length(section_name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  section_type text not null check (section_type in ('system', 'text', 'gallery', 'cards', 'links', 'blocks')),
  is_enabled boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  is_system boolean not null default false,
  is_public boolean not null default true,
  show_in_navigation boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (not is_system or section_type = 'system'),
  check (is_system or section_type <> 'system')
);

alter table public.portfolio_sections
  drop constraint if exists portfolio_sections_section_key_check;
alter table public.portfolio_sections
  add constraint portfolio_sections_section_key_check
  check (section_key ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$');

create table if not exists public.custom_section_content (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.portfolio_sections (id) on delete restrict,
  content jsonb not null,
  display_order integer not null default 0 check (display_order >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists portfolio_sections_enabled_order_idx
  on public.portfolio_sections (is_enabled, display_order)
  where deleted_at is null;

create index if not exists custom_section_content_section_published_order_idx
  on public.custom_section_content (section_id, is_published, display_order);

create or replace function public.protect_portfolio_section_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'System portfolio sections cannot be deleted.';
  end if;

  if tg_op = 'UPDATE' then
    if old.section_key is distinct from new.section_key
      or old.is_system is distinct from new.is_system then
      raise exception 'A portfolio section key and system status cannot be changed.';
    end if;
    if old.is_system and (
      old.section_type is distinct from new.section_type
      or old.is_public is distinct from new.is_public
      or new.deleted_at is not null
    ) then
      raise exception 'System portfolio section visibility scope cannot be changed.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function public.protect_portfolio_section_identity() owner to postgres;
revoke all on function public.protect_portfolio_section_identity() from public, anon, authenticated;

create or replace function public.touch_portfolio_section_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

alter function public.touch_portfolio_section_record() owner to postgres;
revoke all on function public.touch_portfolio_section_record() from public, anon, authenticated;

drop trigger if exists portfolio_sections_protect_identity on public.portfolio_sections;
create trigger portfolio_sections_protect_identity
  before update or delete on public.portfolio_sections
  for each row execute function public.protect_portfolio_section_identity();

drop trigger if exists portfolio_sections_touch_updated_at on public.portfolio_sections;
create trigger portfolio_sections_touch_updated_at
  before insert or update on public.portfolio_sections
  for each row execute function public.touch_portfolio_section_record();

drop trigger if exists custom_section_content_touch_updated_at on public.custom_section_content;
create trigger custom_section_content_touch_updated_at
  before insert or update on public.custom_section_content
  for each row execute function public.touch_portfolio_section_record();

alter table public.portfolio_sections enable row level security;
alter table public.custom_section_content enable row level security;

revoke all on public.portfolio_sections from public, anon, authenticated;
revoke all on public.custom_section_content from public, anon, authenticated;
grant select on public.portfolio_sections to anon, authenticated;
grant insert, update, delete on public.portfolio_sections to authenticated;
grant select on public.custom_section_content to anon, authenticated;
grant insert, update, delete on public.custom_section_content to authenticated;

drop policy if exists portfolio_sections_public_read on public.portfolio_sections;
create policy portfolio_sections_public_read on public.portfolio_sections
  for select to anon, authenticated
  using (
    deleted_at is null
    and is_enabled
    and (is_public or section_key = 'fireEffects')
  );

drop policy if exists portfolio_sections_admin_manage on public.portfolio_sections;
create policy portfolio_sections_admin_manage on public.portfolio_sections
  for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists custom_section_content_public_read on public.custom_section_content;
create policy custom_section_content_public_read on public.custom_section_content
  for select to anon, authenticated
  using (
    is_published
    and exists (
      select 1
      from public.portfolio_sections section
      where section.id = custom_section_content.section_id
        and section.deleted_at is null
        and section.is_enabled
        and section.is_public
        and not section.is_system
    )
  );

drop policy if exists custom_section_content_admin_manage on public.custom_section_content;
create policy custom_section_content_admin_manage on public.custom_section_content
  for all to authenticated
  using (public.is_portfolio_admin())
  with check (
    public.is_portfolio_admin()
    and exists (
      select 1
      from public.portfolio_sections section
      where section.id = custom_section_content.section_id
        and not section.is_system
        and section.deleted_at is null
    )
  );

do $$
declare
  section_table text;
begin
  foreach section_table in array array[
    'projects', 'skills', 'education', 'experience',
    'achievements', 'certifications', 'internships', 'workshops',
    'coding_profiles', 'publications', 'resume', 'social_links'
  ] loop
    execute format('drop policy if exists %I on public.%I', section_table || '_public_read_published', section_table);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (published and exists (select 1 from public.portfolio_sections section where section.section_key = %L and section.deleted_at is null and section.is_enabled and section.is_public))',
      section_table || '_public_read_published',
      section_table,
      case when section_table = 'social_links' then 'socials' else section_table end
    );
  end loop;

  execute 'drop policy if exists profile_public_read_published on public.profile';
  execute $policy$
    create policy profile_public_read_published on public.profile
      for select to anon, authenticated
      using (
        published
        and exists (
          select 1
          from public.portfolio_sections section
          where section.section_key in ('home', 'about')
            and section.deleted_at is null
            and section.is_enabled
            and section.is_public
        )
      )
  $policy$;

  execute 'drop policy if exists site_settings_public_read_published on public.site_settings';
  execute $policy$
    create policy site_settings_public_read_published on public.site_settings
      for select to anon, authenticated
      using (
        published
        and exists (
          select 1
          from public.portfolio_sections section
          where section.deleted_at is null
            and section.is_enabled
            and (section.is_public or section.section_key = 'fireEffects')
            and section.section_key in ('home', 'skills', 'resume', 'fireEffects', 'contact')
        )
      )
  $policy$;
end;
$$;

insert into public.portfolio_sections (
  section_key, section_name, description, section_type, is_enabled,
  display_order, is_system, is_public, show_in_navigation
)
values
  ('home', 'Home / Hero', 'Portfolio introduction and highlights.', 'system', true, 1, true, true, true),
  ('about', 'About & Profile', 'Profile information and biography.', 'system', true, 2, true, true, true),
  ('projects', 'Projects', 'Selected projects and project details.', 'system', true, 3, true, true, true),
  ('skills', 'Skills', 'Skills and technology stack.', 'system', true, 4, true, true, true),
  ('experience', 'Experience', 'Experience timeline.', 'system', true, 5, true, true, true),
  ('education', 'Education', 'Education history.', 'system', true, 6, true, true, true),
  ('certifications', 'Certifications', 'Professional certificates.', 'system', true, 7, true, true, true),
  ('achievements', 'Achievements', 'Awards and achievements.', 'system', true, 8, true, true, true),
  ('internships', 'Internships', 'Internship experience.', 'system', true, 9, true, true, true),
  ('workshops', 'Workshops & Events', 'Workshops and community events.', 'system', true, 10, true, true, true),
  ('codingProfiles', 'Coding Profiles', 'Public developer profiles.', 'system', true, 11, true, true, true),
  ('publications', 'Publications', 'Research and publications.', 'system', true, 12, true, true, true),
  ('resume', 'Resume / CV', 'Published resume files.', 'system', true, 13, true, true, true),
  ('fireEffects', 'Fire Effects Studio', 'Admin settings for the public visual effect.', 'system', true, 14, true, false, false),
  ('contact', 'Contact Settings', 'Public contact information and form.', 'system', true, 15, true, true, true),
  ('socials', 'Footer Social Links', 'Published social profile links.', 'system', true, 16, true, true, true),
  ('messages', 'Messages / Inquiries', 'Private admin inbox.', 'system', true, 17, true, false, false)
on conflict (section_key) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'portfolio_sections'
    ) then
      execute 'alter publication supabase_realtime add table public.portfolio_sections';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'custom_section_content'
    ) then
      execute 'alter publication supabase_realtime add table public.custom_section_content';
    end if;
  end if;
end;
$$;

commit;
