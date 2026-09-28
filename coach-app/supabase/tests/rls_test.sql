-- Tests du schéma : droits d'accès, connexion des joueurs, envoi du coach, notifications
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned
insert into auth.users values ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-0000000000c2'), ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3');

create function pg_temp.as_user(u text, anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', u, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'is_anonymous', anon)::text, true);
end $$;
-- Variante « session » (hors transaction), à terminer par RESET ROLE
create function pg_temp.as_user_session(u text, anon boolean default false) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', u, false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'is_anonymous', anon)::text, false);
end $$;
create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'OK : %', label;
end $$;

-- 1) Le coach crée son club et deux équipes
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
create temp table ids as select (public.create_team('Seniors A', 'Seniors', '#107B2D', 'Quimper Ergué Armel FC')).id as sa;
alter table ids add column u17 uuid;
update ids set u17 = (public.create_team('U17', 'Jeunes', '#2563EB')).id;
select pg_temp.check((select count(*) from public.my_teams()) = 2, 'le coach voit ses 2 équipes');
select pg_temp.check((select count(*) from public.clubs) = 1, 'un seul club créé');
-- Envoi : effectif (Hugo avec code 1234, Louis sans code) + vues
select pg_temp.check(public.coach_push((select sa from ids), 0,
  '{"teamName":"Seniors A","players":[{"id":"p1"},{"id":"p5"}],"reports":[{"playerId":"p1","coachRating":8}]}'::jsonb,
  jsonb_build_array(
    jsonb_build_object('id','p1','firstName','Hugo','lastName','Bernard','number',4,'pinHash', encode(digest('qea-coach:p1:1234','sha256'),'hex')),
    jsonb_build_object('id','p5','firstName','Louis','lastName','Durand','number',9)),
  '{"p1":{"todos":[{"key":"match:m3","title":"Questionnaire","body":"À remplir"}],"players":[{"id":"p1"}]},"p5":{"todos":[]}}'::jsonb) = 1, 'coach_push version 1');
grant select on ids to authenticated;
commit;
select pg_temp.check((select count(*) from public.notification_queue where player_id = 'p1') = 1, 'tâche mise en file pour p1');

-- 2) Conflit de version
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  perform public.coach_push((select sa from ids), 0, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb);
  raise exception 'pas de conflit détecté';
exception when others then
  if sqlerrm <> 'conflict' then raise; end if;
  raise notice 'OK : conflit de version détecté';
end $$;
rollback;

-- 3) Un joueur anonyme rejoint avec le code d'équipe
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.check((select count(*) from public.team_roster((select join_code from public.teams t, ids where t.id = ids.sa))) = 0, 'rls : le joueur ne lit pas teams directement (roster via code inconnu du joueur)');
rollback;
-- Le code est communiqué par le coach : on le récupère en superuser pour le test
select join_code as jc from public.teams where name = 'Seniors A' \gset
select set_config('test.jc', :'jc', false);
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.check((select count(*) from public.team_roster(:'jc')) = 2, 'roster visible avec le code (2 joueurs)');
select pg_temp.check((select bool_and(r.has_pin = (r.player_id = 'p1')) from public.team_roster(:'jc') r), 'roster indique qui a un code, sans le hash');
select pg_temp.check((select count(*) from public.teams) = 0, 'rls : un non-membre ne voit aucune équipe');
select pg_temp.check(public.join_as_player('ZZZZZZ', 'p1', '0000') ->> 'error' = 'invalid_code', 'code équipe inconnu refusé');
commit;

-- mauvais code joueur x5 puis blocage
-- 5 mauvais codes (chacun dans sa propre transaction, comme des appels séparés)
select pg_temp.as_user_session('00000000-0000-0000-0000-0000000000a2', true);
select pg_temp.check(public.join_as_player(:'jc', 'p1', '9999') ->> 'error' = 'wrong_pin', 'mauvais code 1 refusé');
select public.join_as_player(:'jc', 'p1', '9999') is not null;
select public.join_as_player(:'jc', 'p1', '9999') is not null;
select public.join_as_player(:'jc', 'p1', '9999') is not null;
select pg_temp.check(public.join_as_player(:'jc', 'p1', '9999') ->> 'error' = 'wrong_pin', 'mauvais code 5 refusé');
select pg_temp.check(public.join_as_player(:'jc', 'p1', '1234') ->> 'error' = 'too_many_attempts', 'bloqué 15 min après 5 essais, même avec le bon code');
reset role;
delete from public.join_attempts;  -- fin du blocage pour la suite du test

begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.check(public.join_as_player(:'jc', 'p1', '1234') ->> 'team_name' = 'Seniors A', 'Hugo rejoint avec le bon code');
select pg_temp.check((select count(*) from public.player_views) = 1, 'Hugo ne voit que SA vue');
select pg_temp.check((select player_id from public.player_views) = 'p1', 'la vue est bien celle de p1');
select pg_temp.check((select count(*) from public.teams) = 0, 'Hugo ne lit pas le document complet de l''équipe');
select pg_temp.check((select count(*) from public.player_secrets) = 0, 'Hugo ne lit pas les codes');
-- Hugo écrit sa réponse (avec douleur) : autorisé pour lui, refusé pour Louis
insert into public.player_entries (team_id, player_id, kind, ref_id, payload) values ((select sa from ids), 'p1', 'report', 'm2', '{"pain":true,"painZone":"Genou"}');
select pg_temp.check(true, 'Hugo écrit son questionnaire');
do $$ begin
  insert into public.player_entries (team_id, player_id, kind, ref_id, payload) values ((select sa from ids), 'p5', 'report', 'm2', '{}');
  raise exception 'écriture pour un autre joueur acceptée';
exception when insufficient_privilege then raise notice 'OK : impossible d''écrire pour un autre joueur';
end $$;
-- Hugo ne peut pas se promouvoir coach
do $$ begin
  perform public.join_as_coach((select coach_code from public.teams limit 1));
  raise exception 'promotion possible';
exception when others then if sqlerrm not in ('coach_account_required', 'invalid_code') then raise; end if; raise notice 'OK : un compte anonyme ne devient pas coach (%)', sqlerrm;
end $$;
insert into public.push_tokens (token, user_id, team_id, player_id, role) values ('ExponentPushToken[hugo]', '00000000-0000-0000-0000-0000000000a1', (select sa from ids), 'p1', 'player');
commit;

-- 4) Le coach voit l'entrée, reçoit l'alerte douleur, et un 2e coach rejoint par code coach
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.player_entries) = 1, 'le coach lit les réponses des joueurs');
insert into public.push_tokens (token, user_id, team_id, role) values ('ExponentPushToken[coach]', '00000000-0000-0000-0000-00000000000c', (select sa from ids), 'coach');
commit;
select pg_temp.check((select count(*) from public.notification_queue where player_id is null and key like 'pain:p1:%') = 1, 'alerte douleur en file pour le coach');
select coach_code as cc from public.teams where name = 'Seniors A' \gset
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.check((select name from public.join_as_coach(:'cc')) = 'Seniors A', 'coach adjoint rejoint avec le code coach');
select pg_temp.check((select count(*) from public.teams) = 1, 'le coach adjoint voit Seniors A seulement');
commit;

-- 5) Notifications : envoi groupé vers l'API Expo
select pg_temp.check(public.send_pending_pushes() = 2, '2 notifications envoyées (tâche Hugo + alerte coach)');
select pg_temp.check((select count(*) from net.calls) = 1, 'un seul appel HTTP groupé');
select pg_temp.check((select count(*) from public.notification_queue where sent_at is null) = 0, 'file vidée');
select pg_temp.check(public.queue_daily_reminders() = 1, 'rappel quotidien pour Hugo (1 tâche)');
select pg_temp.check(public.send_pending_pushes() = 1, 'rappel envoyé');

-- 6) Retrait d'un joueur de l'effectif : il perd l'accès
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(public.coach_push((select sa from ids), 1, '{"teamName":"Seniors A"}'::jsonb,
  jsonb_build_array(jsonb_build_object('id','p5','firstName','Louis','lastName','Durand')), '{"p5":{"todos":[]}}'::jsonb) = 2, 'push v2 sans Hugo');
commit;
select pg_temp.check((select count(*) from public.team_members where player_id = 'p1') = 0, 'Hugo retiré des membres');
begin;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.check((select count(*) from public.player_views) = 0, 'Hugo ne voit plus rien');
commit;
\echo TOUS LES TESTS SONT PASSÉS
