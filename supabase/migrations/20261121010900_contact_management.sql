-- cSpell:ignore btrim cntrl pubname schemaname supabase

begin;

create or replace function public.is_valid_contact_method(value jsonb, kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and value ?& array['value', 'enabled', 'published']
    and value - array['value', 'enabled', 'published'] = '{}'::jsonb
    and jsonb_typeof(value->'value') = 'string'
    and jsonb_typeof(value->'enabled') = 'boolean'
    and jsonb_typeof(value->'published') = 'boolean'
    and case
      when kind in ('phone', 'whatsapp') then
        char_length(value->>'value') <= 40
        and (
          value->>'value' = ''
          or value->>'value' ~ '^\+?[0-9][0-9 ()-]{5,39}$'
        )
      when kind = 'email' then
        char_length(value->>'value') <= 254
        and (
          value->>'value' = ''
          or value->>'value' ~ '^[A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+([.][A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
        )
      when kind in ('linkedin', 'github') then
        char_length(value->>'value') <= 2048
        and (
          value->>'value' = ''
          or value->>'value' ~ '^https?://[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
        )
      when kind = 'location' then char_length(value->>'value') <= 180
      else false
    end,
    false
  );
$$;

create or replace function public.is_valid_portfolio_contact(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and value ?& array[
      'heading', 'description', 'phone', 'whatsapp', 'email',
      'linkedin', 'github', 'location'
    ]
    and value - array[
      'heading', 'description', 'phone', 'whatsapp', 'email',
      'linkedin', 'github', 'location'
    ] = '{}'::jsonb
    and jsonb_typeof(value->'heading') = 'string'
    and char_length(value->>'heading') <= 80
    and jsonb_typeof(value->'description') = 'string'
    and char_length(value->>'description') <= 360
    and public.is_valid_contact_method(value->'phone', 'phone')
    and public.is_valid_contact_method(value->'whatsapp', 'whatsapp')
    and public.is_valid_contact_method(value->'email', 'email')
    and public.is_valid_contact_method(value->'linkedin', 'linkedin')
    and public.is_valid_contact_method(value->'github', 'github')
    and public.is_valid_contact_method(value->'location', 'location'),
    false
  );
$$;

alter function public.is_valid_contact_method(jsonb, text) owner to postgres;
alter function public.is_valid_portfolio_contact(jsonb) owner to postgres;
revoke all on function public.is_valid_contact_method(jsonb, text) from public;
revoke all on function public.is_valid_portfolio_contact(jsonb) from public;
grant execute on function public.is_valid_contact_method(jsonb, text) to authenticated;
grant execute on function public.is_valid_portfolio_contact(jsonb) to authenticated;

alter table public.site_settings
  add column if not exists contact jsonb;

alter table public.site_settings
  drop constraint if exists site_settings_contact_settings_check;
alter table public.site_settings
  add constraint site_settings_contact_settings_check
  check (contact is null or public.is_valid_portfolio_contact(contact));

alter table public.messages
  add column if not exists phone text not null default '',
  add column if not exists subject text not null default '';

alter table public.messages
  drop constraint if exists messages_phone_check,
  drop constraint if exists messages_subject_check,
  drop constraint if exists messages_status_check;

update public.messages
set status = 'new'
where status = 'unread';

alter table public.messages
  alter column status set default 'new',
  add constraint messages_phone_check check (
    char_length(phone) <= 40
    and (
      phone = ''
      or phone ~ '^\+?[0-9][0-9 ()-]{5,39}$'
    )
  ),
  add constraint messages_subject_check check (
    char_length(subject) <= 180
    and subject = btrim(subject)
  ),
  add constraint messages_status_check check (
    status in ('new', 'read', 'replied', 'archived')
  );

drop policy if exists messages_public_submit on public.messages;
create policy messages_public_submit on public.messages
  for insert to anon, authenticated
  with check (
    status = 'new'
    and char_length(name) between 1 and 120
    and name = btrim(name)
    and name !~ '[[:cntrl:]]'
    and char_length(email) between 1 and 254
    and email = btrim(email)
    and email ~ '^[A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+([.][A-Za-z0-9!#$%&''*+/=?^_`{|}~-]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
    and char_length(subject) between 1 and 180
    and subject = btrim(subject)
    and subject !~ '[[:cntrl:]]'
    and char_length(phone) <= 40
    and (
      phone = ''
      or phone ~ '^\+?[0-9][0-9 ()-]{5,39}$'
    )
    and char_length(message) between 1 and 5000
    and message = btrim(message)
    and replace(replace(replace(message, chr(9), ''), chr(10), ''), chr(13), '') !~ '[[:cntrl:]]'
  );

revoke insert on public.messages from anon, authenticated;
revoke insert (name, email, message, status) on public.messages from anon, authenticated;
grant insert (name, email, phone, subject, message) on public.messages to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    )
  then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;
