-- Photos des joueurs et logos : bucket public en lecture (chemins non devinables),
-- écriture réservée aux coachs de l'équipe (dossier = identifiant de l'équipe).
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;

drop policy if exists photos_coach_write on storage.objects;
create policy photos_coach_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_team_coach(((storage.foldername(name))[1])::uuid));

drop policy if exists photos_coach_update on storage.objects;
create policy photos_coach_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_team_coach(((storage.foldername(name))[1])::uuid));

drop policy if exists photos_coach_delete on storage.objects;
create policy photos_coach_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_team_coach(((storage.foldername(name))[1])::uuid));
