begin;

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
      'heading', 'description', 'iconOnly', 'phone', 'whatsapp', 'email',
      'linkedin', 'github', 'location'
    ] = '{}'::jsonb
    and (
      not (value ? 'iconOnly')
      or jsonb_typeof(value->'iconOnly') = 'boolean'
    )
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

alter function public.is_valid_portfolio_contact(jsonb) owner to postgres;
revoke all on function public.is_valid_portfolio_contact(jsonb) from public;
grant execute on function public.is_valid_portfolio_contact(jsonb) to authenticated;

alter table public.site_settings
  drop constraint if exists site_settings_contact_settings_check;
alter table public.site_settings
  add constraint site_settings_contact_settings_check
  check (contact is null or public.is_valid_portfolio_contact(contact));

commit;
