-- QEA Coach : schéma Supabase (cloud)
-- Principe :
--   * le coach est la source de vérité de son équipe : il envoie tout le document de l'équipe (teams.data)
--     et, pour chaque joueur, une « vue joueur » filtrée (player_views) qui ne contient QUE ce que ce joueur a le droit de voir ;
--   * un joueur n'écrit que ses propres réponses (player_entries), que l'appli du coach fusionne ensuite ;
--   * les notifications partent d'une file (notification_queue) remplie par des triggers et vidée par pg_cron + pg_net.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create or replace function public.gen_code(len int) returns text
language sql volatile as $$
  -- Sans 0/O/1/I pour éviter les confusions à la saisie
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, len);
$$;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  name text not null,
  category text not null default 'Seniors',
  color text not null default '#107B2D',
  join_code text not null unique default public.gen_code(6),
  coach_code text not null unique default public.gen_code(8),
  data jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'player')),
  player_id text,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  check (role = 'coach' or player_id is not null)
);

-- Effectif « public » pour l'écran « Qui es-tu ? » + code joueur haché (jamais lisible par les joueurs)
create table if not exists public.player_secrets (
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id text not null,
  first_name text not null default '',
  last_name text not null default '',
  number integer,
  position text,
  photo_url text,
  pin_hash text,
  archived boolean not null default false,
  primary key (team_id, player_id)
);

create table if not exists public.player_views (
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create table if not exists public.player_entries (
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id text not null,
  kind text not null check (kind in ('report', 'training_feedback', 'survey_response', 'objective')),
  ref_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (team_id, player_id, kind, ref_id)
);

create table if not exists public.join_attempts (
  id bigserial primary key,
  user_id uuid,
  team_id uuid,
  player_id text,
  success boolean not null,
  at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  player_id text,
  role text not null default 'player',
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_queue (
  id bigserial primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id text,            -- null = pour les coachs de l'équipe
  key text not null,         -- dédoublonnage
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (team_id, player_id, key)
);

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation
-- ---------------------------------------------------------------------------

create or replace function public.is_team_coach(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members m where m.team_id = t and m.user_id = auth.uid() and m.role = 'coach')
      or exists (select 1 from teams tm join clubs c on c.id = tm.club_id where tm.id = t and c.owner = auth.uid());
$$;

create or replace function public.my_player_id(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select player_id from team_members where team_id = t and user_id = auth.uid() and role = 'player' limit 1;
$$;

create or replace function public.is_anonymous() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.clubs enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.player_secrets enable row level security;
alter table public.player_views enable row level security;
alter table public.player_entries enable row level security;
alter table public.join_attempts enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_queue enable row level security;

drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select using (
  owner = auth.uid() or exists (select 1 from teams t where t.club_id = clubs.id and public.is_team_coach(t.id))
);
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update using (owner = auth.uid());

-- Les joueurs n'ont PAS accès à teams (le document complet) : uniquement à leur vue.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select using (public.is_team_coach(id));
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update using (public.is_team_coach(id));

drop policy if exists members_select on public.team_members;
create policy members_select on public.team_members for select using (user_id = auth.uid() or public.is_team_coach(team_id));
drop policy if exists members_delete on public.team_members;
create policy members_delete on public.team_members for delete using (user_id = auth.uid() or public.is_team_coach(team_id));

drop policy if exists secrets_coach on public.player_secrets;
create policy secrets_coach on public.player_secrets for all using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

drop policy if exists views_select on public.player_views;
create policy views_select on public.player_views for select using (public.is_team_coach(team_id) or player_id = public.my_player_id(team_id));
drop policy if exists views_write on public.player_views;
create policy views_write on public.player_views for all using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id));

drop policy if exists entries_select on public.player_entries;
create policy entries_select on public.player_entries for select using (public.is_team_coach(team_id) or player_id = public.my_player_id(team_id));
drop policy if exists entries_insert on public.player_entries;
create policy entries_insert on public.player_entries for insert with check (player_id = public.my_player_id(team_id) or public.is_team_coach(team_id));
drop policy if exists entries_update on public.player_entries;
create policy entries_update on public.player_entries for update
  using (player_id = public.my_player_id(team_id) or public.is_team_coach(team_id))
  with check (player_id = public.my_player_id(team_id) or public.is_team_coach(team_id));

drop policy if exists tokens_own on public.push_tokens;
create policy tokens_own on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- join_attempts et notification_queue : aucun accès direct (fonctions security definer / service role uniquement)

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Club du coach connecté (créé au besoin)
create or replace function public.ensure_club(p_name text) returns public.clubs
language plpgsql security definer set search_path = public as $$
declare c clubs;
begin
  if auth.uid() is null or public.is_anonymous() then raise exception 'coach_account_required'; end if;
  select * into c from clubs where owner = auth.uid() order by created_at limit 1;
  if c.id is null then
    insert into clubs (name, owner) values (coalesce(nullif(trim(p_name), ''), 'Mon club'), auth.uid()) returning * into c;
  end if;
  return c;
end $$;

create or replace function public.create_team(p_name text, p_category text, p_color text, p_club_name text default null)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare c clubs; t teams;
begin
  c := public.ensure_club(p_club_name);
  insert into teams (club_id, name, category, color) values (c.id, p_name, coalesce(p_category, 'Seniors'), coalesce(p_color, '#107B2D')) returning * into t;
  insert into team_members (team_id, user_id, role) values (t.id, auth.uid(), 'coach') on conflict on constraint team_members_pkey do nothing;
  return t;
end $$;

-- Un autre coach (adjoint, éducateur) rejoint une équipe avec le code coach
create or replace function public.join_as_coach(p_code text) returns public.teams
language plpgsql security definer set search_path = public as $$
declare t teams;
begin
  if auth.uid() is null or public.is_anonymous() then raise exception 'coach_account_required'; end if;
  select * into t from teams where coach_code = upper(trim(p_code));
  if t.id is null then raise exception 'invalid_code'; end if;
  insert into team_members (team_id, user_id, role) values (t.id, auth.uid(), 'coach')
    on conflict on constraint team_members_pkey do update set role = 'coach', player_id = null;
  return t;
end $$;

-- Écran « Qui es-tu ? » : noms seulement, jamais le code haché
create or replace function public.team_roster(p_join_code text)
returns table (team_id uuid, team_name text, team_color text, club_name text, player_id text, first_name text, last_name text, number integer, "position" text, photo_url text, has_pin boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.color, c.name, s.player_id, s.first_name, s.last_name, s.number, s.position, s.photo_url, s.pin_hash is not null
  from teams t join clubs c on c.id = t.club_id
  join player_secrets s on s.team_id = t.id and not s.archived
  where t.join_code = upper(trim(p_join_code))
  order by s.last_name, s.first_name;
$$;

-- Connexion d'un joueur (compte anonyme) : vérifie le code joueur, avec limitation des essais.
-- Renvoie {ok:true, team_id, team_name, ...} ou {ok:false, error}. Pas d'exception sur un mauvais code,
-- sinon l'essai raté serait annulé avec la transaction et la limitation ne fonctionnerait pas.
create or replace function public.join_as_player(p_join_code text, p_player_id text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare t teams; s player_secrets; fails int;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select * into t from teams where join_code = upper(trim(p_join_code));
  if t.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  select * into s from player_secrets ps where ps.team_id = t.id and ps.player_id = p_player_id and not ps.archived;
  if s.player_id is null then return jsonb_build_object('ok', false, 'error', 'unknown_player'); end if;

  select count(*) into fails from join_attempts a
  where a.team_id = t.id and a.player_id = p_player_id and not a.success and a.at > now() - interval '15 minutes';
  if fails >= 5 then return jsonb_build_object('ok', false, 'error', 'too_many_attempts'); end if;

  if s.pin_hash is not null and encode(digest('qea-coach:' || p_player_id || ':' || coalesce(p_pin, ''), 'sha256'), 'hex') <> s.pin_hash then
    insert into join_attempts (user_id, team_id, player_id, success) values (auth.uid(), t.id, p_player_id, false);
    return jsonb_build_object('ok', false, 'error', 'wrong_pin', 'remaining', 4 - fails);
  end if;

  insert into join_attempts (user_id, team_id, player_id, success) values (auth.uid(), t.id, p_player_id, true);
  -- Réinstaller l'appli = rejoindre à nouveau avec le même joueur : on retrouve toutes ses données
  insert into team_members as m (team_id, user_id, role, player_id) values (t.id, auth.uid(), 'player', p_player_id)
    on conflict on constraint team_members_pkey do update set role = 'player', player_id = excluded.player_id;

  return jsonb_build_object('ok', true, 'team_id', t.id, 'team_name', t.name, 'team_color', t.color, 'team_category', t.category,
                            'club_name', (select c.name from clubs c where c.id = t.club_id));
end $$;

-- Équipes du compte connecté (coach : toutes ses équipes ; joueur : les siennes, sans les données)
create or replace function public.my_teams()
returns table (team_id uuid, team_name text, team_color text, team_category text, club_name text, role text, player_id text, join_code text, coach_code text, version integer)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.color, t.category, c.name,
         case when public.is_team_coach(t.id) then 'coach' else m.role end,
         m.player_id,
         case when public.is_team_coach(t.id) then t.join_code end,
         case when public.is_team_coach(t.id) then t.coach_code end,
         t.version
  from teams t join clubs c on c.id = t.club_id
  left join team_members m on m.team_id = t.id and m.user_id = auth.uid()
  where m.user_id is not null or c.owner = auth.uid()
  order by c.name, t.name;
$$;

-- Envoi atomique du coach : document de l'équipe + effectif + vues joueurs.
-- Contrôle de version optimiste : échoue avec 'conflict' si un autre coach a publié entre-temps.
create or replace function public.coach_push(p_team uuid, p_expected_version integer, p_data jsonb, p_roster jsonb, p_views jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v integer; r jsonb; k text;
begin
  if not public.is_team_coach(p_team) then raise exception 'forbidden'; end if;
  update teams set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid(),
                   name = coalesce(p_data ->> 'teamName', name)
  where id = p_team and version = p_expected_version
  returning version into v;
  if v is null then raise exception 'conflict'; end if;

  for r in select * from jsonb_array_elements(coalesce(p_roster, '[]'::jsonb)) loop
    insert into player_secrets (team_id, player_id, first_name, last_name, number, position, photo_url, pin_hash, archived)
    values (p_team, r ->> 'id', coalesce(r ->> 'firstName', ''), coalesce(r ->> 'lastName', ''), (r ->> 'number')::int, r ->> 'position', r ->> 'photoUrl', r ->> 'pinHash', coalesce((r ->> 'archived')::boolean, false))
    on conflict (team_id, player_id) do update set first_name = excluded.first_name, last_name = excluded.last_name, number = excluded.number,
      position = excluded.position, photo_url = excluded.photo_url, pin_hash = excluded.pin_hash, archived = excluded.archived;
  end loop;
  delete from player_secrets where team_id = p_team and not (player_id in (select jsonb_array_elements(coalesce(p_roster, '[]'::jsonb)) ->> 'id'));

  for k in select jsonb_object_keys(coalesce(p_views, '{}'::jsonb)) loop
    insert into player_views (team_id, player_id, data, updated_at) values (p_team, k, p_views -> k, now())
    on conflict (team_id, player_id) do update set data = excluded.data, updated_at = now()
    where player_views.data is distinct from excluded.data;
  end loop;
  delete from player_views where team_id = p_team and not (player_id in (select jsonb_object_keys(coalesce(p_views, '{}'::jsonb))));
  -- Joueurs retirés de l'effectif : plus d'accès
  delete from team_members where team_id = p_team and role = 'player' and not (player_id in (select jsonb_object_keys(coalesce(p_views, '{}'::jsonb))));
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Chaque vue joueur contient des listes « todos » et « news » [{key, title, body, route}] calculées par l'appli du coach.
-- Toute nouvelle tâche est mise en file une seule fois (clé unique).
create or replace function public.queue_player_todos() returns trigger
language plpgsql security definer set search_path = public as $$
declare todo jsonb;
begin
  -- « todos » (à remplir, rappelés chaque jour) + « news » (compo, préparation : notifiées une fois)
  for todo in select * from jsonb_array_elements(coalesce(new.data -> 'todos', '[]'::jsonb) || coalesce(new.data -> 'news', '[]'::jsonb)) loop
    insert into notification_queue (team_id, player_id, key, title, body, data)
    values (new.team_id, new.player_id, todo ->> 'key', todo ->> 'title', todo ->> 'body', jsonb_build_object('route', todo ->> 'route'))
    on conflict do nothing;
  end loop;
  return new;
end $$;

drop trigger if exists trg_queue_player_todos on public.player_views;
create trigger trg_queue_player_todos after insert or update of data on public.player_views
for each row execute function public.queue_player_todos();

-- Alerte au coach quand un joueur signale une douleur
create or replace function public.queue_coach_alerts() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if new.kind = 'report' and coalesce((new.payload ->> 'pain')::boolean, false) then
    select trim(first_name || ' ' || last_name) into nm from player_secrets where team_id = new.team_id and player_id = new.player_id;
    insert into notification_queue (team_id, player_id, key, title, body, data)
    values (new.team_id, null, 'pain:' || new.player_id || ':' || new.ref_id, '🩹 Douleur signalée',
            coalesce(nm, 'Un joueur') || ' a signalé une douleur' || coalesce(' (' || (new.payload ->> 'painZone') || ')', '') || '.',
            jsonb_build_object('route', '/joueur/' || new.player_id))
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_queue_coach_alerts on public.player_entries;
create trigger trg_queue_coach_alerts after insert or update of payload on public.player_entries
for each row execute function public.queue_coach_alerts();

-- Rappel quotidien des tâches encore à faire (appelé par pg_cron à 18 h)
create or replace function public.queue_daily_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; v record; cnt int;
begin
  for v in select team_id, player_id, data from player_views loop
    cnt := jsonb_array_length(coalesce(v.data -> 'todos', '[]'::jsonb));
    if cnt > 0 then
      insert into notification_queue (team_id, player_id, key, title, body)
      values (v.team_id, v.player_id, 'rappel:' || to_char(now(), 'YYYY-MM-DD'), '⏰ Petit rappel',
              case when cnt = 1 then 'Il te reste 1 chose à remplir pour le coach.' else 'Il te reste ' || cnt || ' choses à remplir pour le coach.' end)
      on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Messages prêts à envoyer (format de l'API Expo Push), sans marquer l'envoi
create or replace function public.pending_push_messages(p_limit integer default 500)
returns table (queue_id bigint, "to" text, title text, body text, data jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, tk.token, q.title, q.body, q.data
  from notification_queue q
  join push_tokens tk on tk.team_id = q.team_id
   and ((q.player_id is not null and tk.role = 'player' and tk.player_id = q.player_id)
     or (q.player_id is null and tk.role = 'coach'))
  where q.sent_at is null
  order by q.id
  limit p_limit;
$$;

-- Envoi via pg_net vers l'API Expo Push (activer les extensions pg_net et pg_cron dans Supabase)
create or replace function public.send_pending_pushes() returns integer
language plpgsql security definer set search_path = public as $$
declare msgs jsonb; ids bigint[];
begin
  select jsonb_agg(jsonb_build_object('to', m."to", 'title', m.title, 'body', m.body, 'data', m.data, 'sound', 'default')), array_agg(distinct m.queue_id)
  into msgs, ids from public.pending_push_messages() m;
  -- Les tâches sans appareil enregistré sont marquées aussi, pour ne pas s'accumuler
  update notification_queue set sent_at = now() where sent_at is null and (ids is null or id = any(ids) or created_at < now() - interval '1 day');
  if msgs is null then return 0; end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := msgs
  );
  return jsonb_array_length(msgs);
end $$;

-- Accès des rôles
revoke all on function public.coach_push(uuid, integer, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.coach_push(uuid, integer, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.team_roster(text) to anon, authenticated;
grant execute on function public.join_as_player(text, text, text) to authenticated;
grant execute on function public.join_as_coach(text) to authenticated;
grant execute on function public.create_team(text, text, text, text) to authenticated;
grant execute on function public.ensure_club(text) to authenticated;
grant execute on function public.my_teams() to authenticated;
revoke all on function public.queue_daily_reminders() from public, anon, authenticated;
revoke all on function public.send_pending_pushes() from public, anon, authenticated;
revoke all on function public.pending_push_messages(integer) from public, anon, authenticated;

grant select, update on public.teams to authenticated;
grant select on public.clubs to authenticated;
grant update on public.clubs to authenticated;
grant select, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.player_secrets to authenticated;
grant select, insert, update, delete on public.player_views to authenticated;
grant select, insert, update on public.player_entries to authenticated;
grant select, insert, update, delete on public.push_tokens to authenticated;
