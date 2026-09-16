begin;
-- Run in the existing Supabase project before enabling account cloud saves.
-- Payload stays TEXT: converting Swift UInt64 RNG through JS Number corrupts saves.
create table if not exists public.franchise_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  payload text not null check (octet_length(payload) between 2 and 3500000),
  engine_version text not null default '0.6.1' check (engine_version = '0.6.1'),
  format_version integer not null default 1 check (format_version = 1),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  check (jsonb_typeof(payload::jsonb) = 'object'),
  check ((payload::jsonb ->> 'slot')::integer = slot)
);
alter table public.franchise_saves enable row level security;
create policy "Players read own careers" on public.franchise_saves for select to authenticated using ((select auth.uid()) = user_id);
-- Writes are only through the validated compare-and-swap function below.
revoke all on public.franchise_saves from anon, authenticated;
grant select on public.franchise_saves to authenticated;
create or replace function public.save_franchise_career(p_slot integer,p_payload text,p_expected_revision integer,p_engine_version text,p_format_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare new_revision integer; caller uuid := auth.uid(); parsed jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_slot not between 1 and 3 or p_expected_revision < 0 or p_engine_version <> '0.6.1' or p_format_version <> 1 or octet_length(p_payload) > 3500000 then raise exception 'Invalid save'; end if;
  parsed := p_payload::jsonb;
  if jsonb_typeof(parsed) <> 'object' or (parsed->>'slot')::integer is distinct from p_slot or jsonb_typeof(parsed->'players') is distinct from 'array' or jsonb_typeof(parsed->'clubs') is distinct from 'array' or jsonb_array_length(parsed->'clubs') <> 7 then raise exception 'Invalid career'; end if;
  if p_expected_revision = 0 then
    insert into public.franchise_saves(user_id,slot,payload,engine_version,format_version)
      values(caller,p_slot,p_payload,p_engine_version,p_format_version)
      on conflict (user_id,slot) do nothing returning revision into new_revision;
  else
    update public.franchise_saves set payload=p_payload,revision=revision+1,updated_at=now(),engine_version=p_engine_version,format_version=p_format_version
      where user_id=caller and slot=p_slot and revision=p_expected_revision returning revision into new_revision;
  end if;
  return new_revision; -- NULL means conflict; never silently replace a newer save.
end $$;
revoke all on function public.save_franchise_career(integer,text,integer,text,integer) from public, anon;
grant execute on function public.save_franchise_career(integer,text,integer,text,integer) to authenticated;

commit;
