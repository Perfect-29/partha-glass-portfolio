-- Run after the contact display mode migration in a disposable database.
do $$
declare
  v_contact jsonb := jsonb_build_object(
    'heading', 'Contact',
    'description', 'Description',
    'phone', jsonb_build_object('value', '', 'enabled', false, 'published', false),
    'whatsapp', jsonb_build_object('value', '', 'enabled', false, 'published', false),
    'email', jsonb_build_object('value', '', 'enabled', false, 'published', false),
    'linkedin', jsonb_build_object('value', '', 'enabled', false, 'published', false),
    'github', jsonb_build_object('value', '', 'enabled', false, 'published', false),
    'location', jsonb_build_object('value', '', 'enabled', false, 'published', false)
  );
begin
  if not public.is_valid_portfolio_contact(v_contact) then
    raise exception 'The legacy contact settings format must remain valid.';
  end if;

  if not public.is_valid_portfolio_contact(v_contact || jsonb_build_object('iconOnly', false)) then
    raise exception 'Icon-only mode OFF must be valid.';
  end if;

  if not public.is_valid_portfolio_contact(v_contact || jsonb_build_object('iconOnly', true)) then
    raise exception 'Icon-only mode ON must be valid.';
  end if;

  if public.is_valid_portfolio_contact(v_contact || jsonb_build_object('iconOnly', 'true')) then
    raise exception 'The iconOnly setting must be a boolean.';
  end if;

  if public.is_valid_portfolio_contact(v_contact || jsonb_build_object('unexpected', true)) then
    raise exception 'Unexpected contact settings fields must remain invalid.';
  end if;
end;
$$;
