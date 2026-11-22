-- Run after all migrations in a disposable Supabase database or SQL editor.
-- The transaction is rolled back, so the fixture records are not retained.
begin;

do $$
declare
  v_count integer;
  v_published boolean;
  v_source_description text;
  v_experience public.experience%rowtype;
begin
  if has_function_privilege('anon', 'public.upsert_generated_experience(text,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.upsert_generated_experience(text,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.enforce_experience_source_visibility()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.enforce_experience_source_visibility()', 'EXECUTE') then
    raise exception 'Client roles must not execute the Experience synchronization function directly.';
  end if;

  insert into public.projects (
    record_id, published, title, category, subtitle, status, description, tags
  ) values (
    'exp_sync_project', true, 'Sync Test Project', 'GIS', 'Source subtitle',
    'In Development', 'Initial source description', array['TypeScript', 'PostGIS']
  );
  insert into public.experience (
    record_id, title, description, source_type, source_record_id
  ) values (
    'exp_sync_manual', 'Manual timeline item', 'Keep this independent.', null, null
  );

  select count(*) into v_count
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_count <> 1 then
    raise exception 'Project create should create exactly one derived Experience entry.';
  end if;

  select * into v_experience
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_experience.published is distinct from true
    or v_experience.organization is not null
    or v_experience.event_date is not null
    or v_experience.category is distinct from 'GIS'
    or v_experience.technologies is distinct from array['TypeScript', 'PostGIS']
    or v_experience.description not like '%Initial source description%' then
    raise exception 'Project conversion did not preserve source facts and publication state.';
  end if;

  update public.projects
  set title = 'Updated Sync Test Project',
      description = 'Updated source description',
      tags = array['React']
  where record_id = 'exp_sync_project';

  select count(*) into v_count
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_count <> 1 then
    raise exception 'Project update created a duplicate derived Experience entry.';
  end if;

  select * into v_experience
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_experience.title not like '%Updated Sync Test Project%'
    or v_experience.description not like '%Updated source description%'
    or v_experience.technologies is distinct from array['React'] then
    raise exception 'Project update did not refresh its derived Experience entry.';
  end if;

  update public.experience
  set description = 'Manually edited Experience description.'
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  select description into v_source_description
  from public.projects
  where record_id = 'exp_sync_project';
  if v_source_description is distinct from 'Updated source description' then
    raise exception 'Editing a derived description must not modify the source record.';
  end if;
  update public.projects
  set description = 'Third source description'
  where record_id = 'exp_sync_project';

  select * into v_experience
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_experience.description is distinct from 'Manually edited Experience description.'
    or v_experience.generated_description not like '%Third source description%' then
    raise exception 'Source updates should preserve a manually edited Experience description.';
  end if;

  update public.projects set published = false where record_id = 'exp_sync_project';
  update public.experience
  set published = true
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  select published into v_published
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_published is distinct from false then
    raise exception 'Unpublishing a source should unpublish its derived entry.';
  end if;

  update public.projects set published = true where record_id = 'exp_sync_project';
  select count(*) into v_count
  from public.experience
  where source_type = 'projects' and source_record_id = 'exp_sync_project';
  if v_count <> 1 then
    raise exception 'Republishing a source should reuse its existing derived entry.';
  end if;

  begin
    insert into public.experience (
      record_id, title, description, source_type, source_record_id
    ) values (
      'exp_sync_duplicate', 'Duplicate', 'Must be rejected.', 'projects', 'exp_sync_project'
    );
    raise exception 'The unique source reference should reject duplicate derived entries.';
  exception when unique_violation then
    null;
  end;

  insert into public.achievements (record_id, title, issuer, date, description, category)
  values ('exp_sync_achievement', 'Sync Test Award', 'Test Issuer', '2026', 'Award details', 'Recognition');
  insert into public.skills (record_id, name, category, level)
  values ('exp_sync_skill', 'SQL', 'Database', 'Proficient');
  insert into public.internships (
    record_id, company, role, duration, start_date, end_date, description, skills, certificate_url
  ) values (
    'exp_sync_internship', 'Test Company', 'Developer Intern', '3 months',
    '2026-01', '2026-03', 'Internship details', array['React', 'SQL'],
    'https://example.test/internship.pdf'
  );
  insert into public.workshops (record_id, title, institution, date, description)
  values ('exp_sync_workshop', 'Sync Test Workshop', 'Test Institute', '2026-02', 'Workshop details');
  insert into public.certifications (
    record_id, title, organization, issue_date, category, credential_id, credential_url, certificate_url
  ) values (
    'exp_sync_certification', 'Sync Test Certificate', 'Test Academy', '2026-03',
    'Training', '', '', 'https://example.test/certificate.pdf'
  );
  insert into public.publications (
    record_id, title, abstract, publication_date, venue, doi, publication_url, pdf_url
  ) values (
    'exp_sync_publication', 'Sync Test Paper', 'Research abstract', '2026-04',
    'Test Journal', '', '', ''
  );
  insert into public.education (record_id, degree, institution, period, status)
  values ('exp_sync_education', 'Test Degree', 'Test University', '2024-2028', 'In progress');

  if not exists (
    select 1 from public.experience
    where source_type = 'achievements' and source_record_id = 'exp_sync_achievement'
      and organization = 'Test Issuer' and event_date = '2026' and category = 'Recognition'
  ) then raise exception 'Achievement conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'skills' and source_record_id = 'exp_sync_skill'
      and technologies = array['SQL'] and category = 'Database'
  ) then raise exception 'Skill conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'internships' and source_record_id = 'exp_sync_internship'
      and organization = 'Test Company' and event_date = '2026-01 - 2026-03'
      and technologies = array['React', 'SQL']
  ) then raise exception 'Internship conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'workshops' and source_record_id = 'exp_sync_workshop'
      and organization = 'Test Institute' and event_date = '2026-02'
  ) then raise exception 'Workshop conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'certifications' and source_record_id = 'exp_sync_certification'
      and organization = 'Test Academy' and event_date = '2026-03'
  ) then raise exception 'Certification conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'publications' and source_record_id = 'exp_sync_publication'
      and organization = 'Test Journal' and event_date = '2026-04'
  ) then raise exception 'Publication conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'education' and source_record_id = 'exp_sync_education'
      and organization = 'Test University' and event_date = '2024-2028'
  ) then raise exception 'Education conversion did not map its source fields.'; end if;
  if not exists (
    select 1 from public.experience
    where record_id = 'exp_sync_manual' and source_type is null and source_record_id is null
  ) then raise exception 'Manual Experience entries must remain independent.'; end if;

  delete from public.projects where record_id = 'exp_sync_project';
  if exists (
    select 1 from public.experience
    where source_type = 'projects' and source_record_id = 'exp_sync_project'
  ) then raise exception 'Deleting a source should delete only its corresponding derived entry.'; end if;
  if not exists (
    select 1 from public.experience where record_id = 'exp_sync_manual'
  ) then raise exception 'Deleting a source must not delete manual Experience entries.'; end if;
  if not exists (
    select 1 from public.experience
    where source_type = 'achievements' and source_record_id = 'exp_sync_achievement'
  ) then raise exception 'Deleting one source must leave unrelated derived entries intact.'; end if;
end;
$$;

rollback;
