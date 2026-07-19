-- Execute este arquivo uma única vez no SQL Editor do seu projeto Supabase.
-- Ele cria o catálogo, protege os compradores e faz reservas atômicas.

create extension if not exists pgcrypto;

create table if not exists public.raffle_formatura_numbers (
  number integer primary key check (number between 0 and 100),
  status text not null default 'available'
    check (status in ('available', 'reserved', 'payment_reported', 'paid')),
  reservation_id uuid,
  buyer_name text,
  buyer_phone text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.raffle_formatura_numbers (number)
select generate_series(0, 100)
on conflict (number) do nothing;

-- Números informados pela organizadora como já vendidos.
update public.raffle_formatura_numbers
set status = 'paid', updated_at = now()
where number in (7, 13, 18, 27, 43, 49);

alter table public.raffle_formatura_numbers enable row level security;
revoke all on table public.raffle_formatura_numbers from anon, authenticated;

create index if not exists raffle_formatura_reservation_id_idx
  on public.raffle_formatura_numbers (reservation_id);

create or replace function public.get_formatura_raffle_numbers()
returns table (number integer, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.raffle_formatura_numbers as raffle
  set status = 'available', reservation_id = null, buyer_name = null,
      buyer_phone = null, expires_at = null, updated_at = now()
  where raffle.status = 'reserved' and raffle.expires_at <= now();

  return query
  select raffle.number, raffle.status, raffle.expires_at
  from public.raffle_formatura_numbers as raffle
  order by raffle.number;
end;
$$;

create or replace function public.reserve_formatura_raffle_numbers(
  p_numbers integer[], p_buyer_name text, p_buyer_phone text
)
returns table (reservation_id uuid, expires_at timestamptz, numbers integer[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numbers integer[];
  v_reservation_id uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + interval '30 minutes';
begin
  select array_agg(item order by item)
  into v_numbers
  from (select distinct unnest(p_numbers) as item) as normalized
  where item between 0 and 100;

  if coalesce(cardinality(v_numbers), 0) = 0 then
    raise exception 'Choose at least one valid number';
  end if;
  if cardinality(v_numbers) > 20 then
    raise exception 'Choose at most 20 numbers';
  end if;
  if length(trim(coalesce(p_buyer_name, ''))) < 3 then
    raise exception 'Buyer name is required';
  end if;
  if length(regexp_replace(coalesce(p_buyer_phone, ''), '\D', '', 'g')) not between 10 and 11 then
    raise exception 'Buyer phone is invalid';
  end if;

  -- Serializa as reservas desta rifa e impede venda dupla.
  perform pg_advisory_xact_lock(hashtextextended('rifa-formatura-2026', 0));

  update public.raffle_formatura_numbers as raffle
  set status = 'available', reservation_id = null, buyer_name = null,
      buyer_phone = null, expires_at = null, updated_at = now()
  where raffle.status = 'reserved' and raffle.expires_at <= now();

  if exists (
    select 1 from public.raffle_formatura_numbers as raffle
    where raffle.number = any(v_numbers) and raffle.status <> 'available'
  ) then
    raise exception 'One or more numbers are already reserved';
  end if;

  update public.raffle_formatura_numbers as raffle
  set status = 'reserved', reservation_id = v_reservation_id,
      buyer_name = trim(p_buyer_name),
      buyer_phone = regexp_replace(p_buyer_phone, '\D', '', 'g'),
      expires_at = v_expires_at, updated_at = now()
  where raffle.number = any(v_numbers) and raffle.status = 'available';

  return query select v_reservation_id, v_expires_at, v_numbers;
end;
$$;

create or replace function public.report_formatura_raffle_payment(p_reservation_id uuid)
returns table (reservation_id uuid, numbers integer[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numbers integer[];
begin
  select array_agg(raffle.number order by raffle.number)
  into v_numbers
  from public.raffle_formatura_numbers as raffle
  where raffle.reservation_id = p_reservation_id
    and raffle.status = 'reserved'
    and raffle.expires_at > now();

  if coalesce(cardinality(v_numbers), 0) = 0 then
    raise exception 'Reservation not found or expired';
  end if;

  update public.raffle_formatura_numbers as raffle
  set status = 'payment_reported', expires_at = null, updated_at = now()
  where raffle.reservation_id = p_reservation_id
    and raffle.number = any(v_numbers);

  return query select p_reservation_id, v_numbers;
end;
$$;

revoke all on function public.get_formatura_raffle_numbers() from public;
revoke all on function public.reserve_formatura_raffle_numbers(integer[], text, text) from public;
revoke all on function public.report_formatura_raffle_payment(uuid) from public;
grant execute on function public.get_formatura_raffle_numbers() to anon, authenticated;
grant execute on function public.reserve_formatura_raffle_numbers(integer[], text, text) to anon, authenticated;
grant execute on function public.report_formatura_raffle_payment(uuid) to anon, authenticated;
