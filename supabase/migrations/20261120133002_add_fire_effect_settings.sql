begin;

create or replace function public.is_valid_fire_effect_colors(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) is distinct from 'array' then false
    else jsonb_array_length(value) between 1 and 8
      and not exists (
        select 1
        from jsonb_array_elements(value) as color(item)
        where jsonb_typeof(color.item) is distinct from 'string'
          or color.item #>> '{}' !~ '^#[0-9A-Fa-f]{6}$'
      )
  end;
$$;

revoke all on function public.is_valid_fire_effect_colors(jsonb) from public;
grant execute on function public.is_valid_fire_effect_colors(jsonb) to anon, authenticated;
alter function public.is_valid_fire_effect_colors(jsonb) owner to postgres;

alter table public.site_settings
  add column fire_effects jsonb not null default
    '{"enabled":true,"preset":"classic-fire","colors":["#FFD648","#FF7018","#FF2020"],"particleSize":1,"density":1,"speed":1,"glow":1,"trailLength":14,"lifetime":650}'::jsonb,
  add constraint site_settings_fire_effects_check check (
    jsonb_typeof(fire_effects) = 'object'
    and fire_effects ?& array[
      'enabled', 'preset', 'colors', 'particleSize', 'density',
      'speed', 'glow', 'trailLength', 'lifetime'
    ]
    and fire_effects - array[
      'enabled', 'preset', 'colors', 'particleSize', 'density',
      'speed', 'glow', 'trailLength', 'lifetime'
    ] = '{}'::jsonb
    and jsonb_typeof(fire_effects->'enabled') = 'boolean'
    and fire_effects->>'preset' in (
      'classic-fire', 'neon-red', 'electric-blue', 'purple',
      'golden', 'emerald-green', 'ice-blue', 'rainbow', 'custom'
    )
    and public.is_valid_fire_effect_colors(fire_effects->'colors')
    and case
      when jsonb_typeof(fire_effects->'particleSize') = 'number'
        then (fire_effects->>'particleSize')::numeric between 0.5 and 3
      else false
    end
    and case
      when jsonb_typeof(fire_effects->'density') = 'number'
        then (fire_effects->>'density')::numeric between 0.25 and 2
      else false
    end
    and case
      when jsonb_typeof(fire_effects->'speed') = 'number'
        then (fire_effects->>'speed')::numeric between 0.5 and 2
      else false
    end
    and case
      when jsonb_typeof(fire_effects->'glow') = 'number'
        then (fire_effects->>'glow')::numeric between 0 and 2
      else false
    end
    and case
      when jsonb_typeof(fire_effects->'trailLength') = 'number'
        then (fire_effects->>'trailLength')::numeric between 3 and 24
          and floor((fire_effects->>'trailLength')::numeric) = (fire_effects->>'trailLength')::numeric
      else false
    end
    and case
      when jsonb_typeof(fire_effects->'lifetime') = 'number'
        then (fire_effects->>'lifetime')::numeric between 100 and 1200
          and floor((fire_effects->>'lifetime')::numeric) = (fire_effects->>'lifetime')::numeric
      else false
    end
  );

commit;
