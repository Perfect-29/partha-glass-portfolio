-- Keep Experience rows synchronized with their original portfolio records.
begin;

alter table public.experience
  add column if not exists source_type text,
  add column if not exists source_record_id text,
  add column if not exists organization text,
  add column if not exists event_date text,
  add column if not exists category text,
  add column if not exists technologies text[] not null default array[]::text[],
  add column if not exists generated_description text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience'::regclass
      and conname = 'experience_source_type_check'
  ) then
    alter table public.experience
      add constraint experience_source_type_check
      check (source_type is null or source_type in (
        'projects', 'achievements', 'skills', 'internships',
        'workshops', 'certifications', 'publications', 'education'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience'::regclass
      and conname = 'experience_source_reference_check'
  ) then
    alter table public.experience
      add constraint experience_source_reference_check
      check (
        (source_type is null and source_record_id is null)
        or (source_type is not null and source_record_id is not null and source_record_id <> '')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.experience'::regclass
      and conname = 'experience_technologies_limit_check'
  ) then
    alter table public.experience
      add constraint experience_technologies_limit_check
      check (cardinality(technologies) <= 100);
  end if;
end;
$$;

create unique index if not exists experience_source_reference_uidx
  on public.experience (source_type, source_record_id);

create or replace function public.experience_conversion_payload(
  p_source_type text,
  p_source_record jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_source_title text;
  v_title text;
  v_description text;
  v_organization text;
  v_event_date text;
  v_category text;
  v_technologies text[] := array[]::text[];
begin
  if jsonb_typeof(p_source_record) is distinct from 'object' then
    raise exception 'Experience conversion requires a source record object.';
  end if;

  case p_source_type
    when 'projects' then
      v_source_title := nullif(btrim(p_source_record->>'title'), '');
      v_title := concat_ws(': ', 'Project', v_source_title);
      v_category := nullif(btrim(p_source_record->>'category'), '');
      v_description := concat_ws(E'\n\n',
        nullif(btrim(p_source_record->>'subtitle'), ''),
        nullif(btrim(p_source_record->>'description'), ''),
        case when nullif(btrim(p_source_record->>'status'), '') is not null
          then 'Status: ' || btrim(p_source_record->>'status') end,
        case when nullif(btrim(p_source_record->>'implementation'), '') is not null
          then 'Implementation: ' || btrim(p_source_record->>'implementation') end
      );
      select coalesce(array_agg(btrim(item)), array[]::text[])
      into v_technologies
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_source_record->'tags') = 'array'
          then p_source_record->'tags' else '[]'::jsonb end
      ) as tag(item)
      where btrim(item) <> '';

    when 'achievements' then
      v_source_title := nullif(btrim(p_source_record->>'title'), '');
      v_title := concat_ws(': ', 'Achievement', v_source_title);
      v_organization := coalesce(
        nullif(btrim(p_source_record->>'organization'), ''),
        nullif(btrim(p_source_record->>'issuer'), '')
      );
      v_event_date := nullif(btrim(p_source_record->>'date'), '');
      v_category := nullif(btrim(p_source_record->>'category'), '');
      v_description := nullif(btrim(p_source_record->>'description'), '');

    when 'skills' then
      v_source_title := nullif(btrim(p_source_record->>'name'), '');
      v_title := concat_ws(': ', 'Skill', v_source_title);
      v_category := nullif(btrim(p_source_record->>'category'), '');
      v_description := case
        when nullif(btrim(p_source_record->>'level'), '') is not null
          then 'Proficiency: ' || btrim(p_source_record->>'level')
        else null
      end;
      if v_source_title is not null then
        v_technologies := array[v_source_title];
      end if;

    when 'internships' then
      v_source_title := nullif(btrim(p_source_record->>'role'), '');
      v_title := concat_ws(': ', 'Internship', coalesce(
        v_source_title,
        nullif(btrim(p_source_record->>'company'), '')
      ));
      v_organization := nullif(btrim(p_source_record->>'company'), '');
      v_event_date := nullif(concat_ws(' - ',
        nullif(btrim(p_source_record->>'start_date'), ''),
        nullif(btrim(p_source_record->>'end_date'), '')
      ), '');
      v_category := 'Internship';
      v_description := concat_ws(E'\n\n',
        nullif(btrim(p_source_record->>'description'), ''),
        case when nullif(btrim(p_source_record->>'duration'), '') is not null
          then 'Duration: ' || btrim(p_source_record->>'duration') end
      );
      select coalesce(array_agg(btrim(item)), array[]::text[])
      into v_technologies
      from jsonb_array_elements_text(
        case when jsonb_typeof(p_source_record->'skills') = 'array'
          then p_source_record->'skills' else '[]'::jsonb end
      ) as skill(item)
      where btrim(item) <> '';

    when 'workshops' then
      v_source_title := nullif(btrim(p_source_record->>'title'), '');
      v_title := concat_ws(': ', 'Workshop', v_source_title);
      v_organization := nullif(btrim(p_source_record->>'institution'), '');
      v_event_date := nullif(btrim(p_source_record->>'date'), '');
      v_category := 'Workshop';
      v_description := nullif(btrim(p_source_record->>'description'), '');

    when 'certifications' then
      v_source_title := nullif(btrim(p_source_record->>'title'), '');
      v_title := concat_ws(': ', 'Certification', v_source_title);
      v_organization := nullif(btrim(p_source_record->>'organization'), '');
      v_event_date := nullif(btrim(p_source_record->>'issue_date'), '');
      v_category := nullif(btrim(p_source_record->>'category'), '');
      v_description := v_category;

    when 'publications' then
      v_source_title := nullif(btrim(p_source_record->>'title'), '');
      v_title := concat_ws(': ', 'Publication', v_source_title);
      v_organization := nullif(btrim(p_source_record->>'venue'), '');
      v_event_date := nullif(btrim(p_source_record->>'publication_date'), '');
      v_category := 'Publication';
      v_description := nullif(btrim(p_source_record->>'abstract'), '');

    when 'education' then
      v_source_title := nullif(btrim(p_source_record->>'degree'), '');
      v_title := concat_ws(': ', 'Education', v_source_title);
      v_organization := nullif(btrim(p_source_record->>'institution'), '');
      v_event_date := nullif(btrim(p_source_record->>'period'), '');
      v_category := 'Education';
      v_description := case
        when nullif(btrim(p_source_record->>'status'), '') is not null
          then 'Status: ' || btrim(p_source_record->>'status')
        else null
      end;

    else
      raise exception 'Unsupported Experience source type: %', p_source_type;
  end case;

  v_title := left(coalesce(nullif(btrim(v_title), ''), 'Portfolio activity'), 240);
  v_description := left(coalesce(nullif(btrim(v_description), ''), v_title), 5000);

  return jsonb_build_object(
    'title', v_title,
    'description', v_description,
    'organization', left(v_organization, 240),
    'event_date', left(v_event_date, 120),
    'category', left(v_category, 160),
    'technologies', to_jsonb(v_technologies)
  );
end;
$$;

create or replace function public.upsert_generated_experience(
  p_source_type text,
  p_source_record jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_record_id text;
  v_payload jsonb;
  v_display_order integer;
begin
  if auth.uid() is not null and not public.is_portfolio_admin() then
    raise exception 'Administrator access is required to synchronize Experience entries.';
  end if;

  if p_source_type not in (
    'projects', 'achievements', 'skills', 'internships',
    'workshops', 'certifications', 'publications', 'education'
  ) then
    raise exception 'Unsupported Experience source type: %', p_source_type;
  end if;

  v_source_record_id := nullif(p_source_record->>'record_id', '');
  if v_source_record_id is null then
    raise exception 'Experience source record is missing its record_id.';
  end if;

  v_payload := public.experience_conversion_payload(p_source_type, p_source_record);
  select coalesce(max(display_order) + 1, 0)
  into v_display_order
  from public.experience;

  insert into public.experience (
    record_id,
    display_order,
    published,
    updated_by,
    title,
    description,
    source_type,
    source_record_id,
    organization,
    event_date,
    category,
    technologies,
    generated_description
  )
  values (
    'derived-' || replace(gen_random_uuid()::text, '-', ''),
    v_display_order,
    coalesce((p_source_record->>'published')::boolean, false),
    nullif(p_source_record->>'updated_by', '')::uuid,
    v_payload->>'title',
    v_payload->>'description',
    p_source_type,
    v_source_record_id,
    v_payload->>'organization',
    v_payload->>'event_date',
    v_payload->>'category',
    array(select jsonb_array_elements_text(v_payload->'technologies')),
    v_payload->>'description'
  )
  on conflict (source_type, source_record_id) do update
  set published = excluded.published,
      updated_by = excluded.updated_by,
      title = excluded.title,
      description = case
        when public.experience.description is not distinct from public.experience.generated_description
          then excluded.description
        else public.experience.description
      end,
      organization = excluded.organization,
      event_date = excluded.event_date,
      category = excluded.category,
      technologies = excluded.technologies,
      generated_description = excluded.generated_description;
end;
$$;

create or replace function public.sync_experience_from_source_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.experience
    where source_type = tg_table_name
      and source_record_id = old.record_id;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.record_id is distinct from new.record_id then
      delete from public.experience
      where source_type = tg_table_name
        and source_record_id = old.record_id;
    end if;
  end if;

  perform public.upsert_generated_experience(tg_table_name, to_jsonb(new));
  return new;
end;
$$;

create or replace function public.enforce_experience_source_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_published boolean;
begin
  if new.source_type is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.source_type is distinct from new.source_type
      or old.source_record_id is distinct from new.source_record_id then
      raise exception 'An Experience source reference cannot be changed directly.';
    end if;
  end if;

  case new.source_type
    when 'projects' then
      select published into v_source_published from public.projects where record_id = new.source_record_id;
    when 'achievements' then
      select published into v_source_published from public.achievements where record_id = new.source_record_id;
    when 'skills' then
      select published into v_source_published from public.skills where record_id = new.source_record_id;
    when 'internships' then
      select published into v_source_published from public.internships where record_id = new.source_record_id;
    when 'workshops' then
      select published into v_source_published from public.workshops where record_id = new.source_record_id;
    when 'certifications' then
      select published into v_source_published from public.certifications where record_id = new.source_record_id;
    when 'publications' then
      select published into v_source_published from public.publications where record_id = new.source_record_id;
    when 'education' then
      select published into v_source_published from public.education where record_id = new.source_record_id;
    else
      raise exception 'Unsupported Experience source type: %', new.source_type;
  end case;

  if not found then
    raise exception 'The source record for this Experience entry no longer exists.';
  end if;
  new.published := v_source_published;
  return new;
end;
$$;

alter function public.experience_conversion_payload(text, jsonb) owner to postgres;
alter function public.upsert_generated_experience(text, jsonb) owner to postgres;
alter function public.sync_experience_from_source_trigger() owner to postgres;
alter function public.enforce_experience_source_visibility() owner to postgres;

revoke all on function public.experience_conversion_payload(text, jsonb) from public, anon, authenticated;
revoke all on function public.upsert_generated_experience(text, jsonb) from public, anon, authenticated;
revoke all on function public.sync_experience_from_source_trigger() from public, anon, authenticated;
revoke all on function public.enforce_experience_source_visibility() from public, anon, authenticated;

drop trigger if exists experience_enforce_source_visibility on public.experience;
create trigger experience_enforce_source_visibility
  before insert or update on public.experience
  for each row execute function public.enforce_experience_source_visibility();

do $$
declare
  source_table text;
begin
  foreach source_table in array array[
    'projects', 'achievements', 'skills', 'internships',
    'workshops', 'certifications', 'publications', 'education'
  ] loop
    execute format('drop trigger if exists %I on public.%I', source_table || '_sync_experience', source_table);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.sync_experience_from_source_trigger()',
      source_table || '_sync_experience',
      source_table
    );
  end loop;
end;
$$;

select public.upsert_generated_experience('projects', to_jsonb(source_row)) from public.projects as source_row;
select public.upsert_generated_experience('achievements', to_jsonb(source_row)) from public.achievements as source_row;
select public.upsert_generated_experience('skills', to_jsonb(source_row)) from public.skills as source_row;
select public.upsert_generated_experience('internships', to_jsonb(source_row)) from public.internships as source_row;
select public.upsert_generated_experience('workshops', to_jsonb(source_row)) from public.workshops as source_row;
select public.upsert_generated_experience('certifications', to_jsonb(source_row)) from public.certifications as source_row;
select public.upsert_generated_experience('publications', to_jsonb(source_row)) from public.publications as source_row;
select public.upsert_generated_experience('education', to_jsonb(source_row)) from public.education as source_row;

commit;
