alter table public.profile
  drop constraint if exists profile_hero_check,
  add constraint profile_hero_check check (
    jsonb_typeof(hero) = 'object'
    and hero ?& array[
      'eyebrow', 'headline', 'roles', 'tagline', 'primaryButton',
      'secondaryButton', 'image', 'imageAlt', 'imagePosition'
    ]
    and hero - array[
      'eyebrow', 'headline', 'roles', 'tagline', 'primaryButton',
      'primaryButtonLink', 'secondaryButton', 'secondaryButtonLink',
      'image', 'imageAlt', 'imagePosition', 'showFeatures', 'features'
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
    and (
      not (hero ? 'primaryButtonLink')
      or (
        jsonb_typeof(hero->'primaryButtonLink') = 'string'
        and char_length(hero->>'primaryButtonLink') <= 2048
      )
    )
    and (
      not (hero ? 'secondaryButtonLink')
      or (
        jsonb_typeof(hero->'secondaryButtonLink') = 'string'
        and char_length(hero->>'secondaryButtonLink') <= 2048
      )
    )
    and (
      not (hero ? 'showFeatures')
      or jsonb_typeof(hero->'showFeatures') = 'boolean'
    )
    and (
      not (hero ? 'features')
      or jsonb_typeof(hero->'features') = 'array'
    )
  );
