-- Painel administrativo seguro da Rifa da Formatura.
-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Depois, crie o usuário em Authentication > Users e use o comando de
-- cadastramento que aparece no final deste arquivo.

create table if not exists public.raffle_formatura_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.raffle_formatura_admins enable row level security;
revoke all on table public.raffle_formatura_admins from anon, authenticated;

create or replace function public.is_formatura_raffle_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.raffle_formatura_admins as admin
    where admin.user_id = (select auth.uid())
  );
$$;

create or replace function public.get_formatura_raffle_admin_dashboard()
returns table (
  number integer,
  status text,
  reservation_id uuid,
  buyer_name text,
  buyer_phone text,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_formatura_raffle_admin() then
    raise exception using
      errcode = '42501',
      message = 'Admin access required';
  end if;

  update public.raffle_formatura_numbers as raffle
  set status = 'available', reservation_id = null, buyer_name = null,
      buyer_phone = null, expires_at = null, updated_at = now()
  where raffle.status = 'reserved' and raffle.expires_at <= now();

  return query
  select raffle.number, raffle.status, raffle.reservation_id,
         raffle.buyer_name, raffle.buyer_phone, raffle.expires_at,
         raffle.updated_at
  from public.raffle_formatura_numbers as raffle
  order by raffle.number;
end;
$$;

create or replace function public.admin_confirm_formatura_raffle_payment(
  p_reservation_id uuid
)
returns table (reservation_id uuid, numbers integer[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numbers integer[];
begin
  if not public.is_formatura_raffle_admin() then
    raise exception using
      errcode = '42501',
      message = 'Admin access required';
  end if;

  if p_reservation_id is null then
    raise exception 'Reservation is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rifa-formatura-2026', 0));

  select array_agg(raffle.number order by raffle.number)
  into v_numbers
  from public.raffle_formatura_numbers as raffle
  where raffle.reservation_id = p_reservation_id
    and raffle.status in ('reserved', 'payment_reported');

  if coalesce(cardinality(v_numbers), 0) = 0 then
    raise exception 'Reservation not found or already updated';
  end if;

  update public.raffle_formatura_numbers as raffle
  set status = 'paid', expires_at = null, updated_at = now()
  where raffle.reservation_id = p_reservation_id
    and raffle.number = any(v_numbers);

  return query select p_reservation_id, v_numbers;
end;
$$;

create or replace function public.admin_release_formatura_raffle_number(
  p_number integer
)
returns table (released_number integer, previous_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_status text;
begin
  if not public.is_formatura_raffle_admin() then
    raise exception using
      errcode = '42501',
      message = 'Admin access required';
  end if;

  if p_number not between 0 and 100 then
    raise exception 'Invalid raffle number';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rifa-formatura-2026', 0));

  select raffle.status
  into v_previous_status
  from public.raffle_formatura_numbers as raffle
  where raffle.number = p_number;

  if v_previous_status is null then
    raise exception 'Raffle number not found';
  end if;

  update public.raffle_formatura_numbers as raffle
  set status = 'available', reservation_id = null, buyer_name = null,
      buyer_phone = null, expires_at = null, updated_at = now()
  where raffle.number = p_number;

  return query select p_number, v_previous_status;
end;
$$;

create or replace function public.admin_mark_formatura_raffle_number_paid(
  p_number integer,
  p_buyer_name text default null,
  p_buyer_phone text default null
)
returns table (sold_number integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(coalesce(p_buyer_name, '')), '');
  v_phone text := nullif(regexp_replace(coalesce(p_buyer_phone, ''), '\D', '', 'g'), '');
begin
  if not public.is_formatura_raffle_admin() then
    raise exception using
      errcode = '42501',
      message = 'Admin access required';
  end if;

  if p_number not between 0 and 100 then
    raise exception 'Invalid raffle number';
  end if;

  if v_name is not null and length(v_name) < 3 then
    raise exception 'Buyer name is too short';
  end if;

  if v_phone is not null and length(v_phone) not between 10 and 11 then
    raise exception 'Buyer phone is invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('rifa-formatura-2026', 0));

  update public.raffle_formatura_numbers as raffle
  set status = 'paid', reservation_id = null, buyer_name = v_name,
      buyer_phone = v_phone, expires_at = null, updated_at = now()
  where raffle.number = p_number and raffle.status = 'available';

  if not found then
    raise exception 'Raffle number is not available';
  end if;

  return query select p_number;
end;
$$;

revoke all on function public.is_formatura_raffle_admin() from public;
revoke all on function public.get_formatura_raffle_admin_dashboard() from public;
revoke all on function public.admin_confirm_formatura_raffle_payment(uuid) from public;
revoke all on function public.admin_release_formatura_raffle_number(integer) from public;
revoke all on function public.admin_mark_formatura_raffle_number_paid(integer, text, text) from public;

grant execute on function public.is_formatura_raffle_admin() to authenticated;
grant execute on function public.get_formatura_raffle_admin_dashboard() to authenticated;
grant execute on function public.admin_confirm_formatura_raffle_payment(uuid) to authenticated;
grant execute on function public.admin_release_formatura_raffle_number(integer) to authenticated;
grant execute on function public.admin_mark_formatura_raffle_number_paid(integer, text, text) to authenticated;

-- ATIVAR A CONTA ADMINISTRATIVA
-- 1. Crie o usuário em Authentication > Users > Add user.
-- 2. Troque o e-mail abaixo pelo e-mail criado, remova os dois hifens iniciais
--    e execute somente o comando.
--
-- insert into public.raffle_formatura_admins (user_id)
-- select id from auth.users where lower(email) = lower('SEU_EMAIL_AQUI')
-- on conflict (user_id) do nothing;
