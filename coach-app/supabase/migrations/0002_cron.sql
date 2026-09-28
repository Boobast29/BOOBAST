-- Planification (Supabase : activer pg_cron et pg_net dans Database > Extensions)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Envoi des notifications en attente, chaque minute
select cron.schedule('qea-send-push', '* * * * *', $$select public.send_pending_pushes()$$);
-- Rappel des tâches non faites, tous les jours à 16 h UTC (18 h en France l'été, 17 h l'hiver)
select cron.schedule('qea-daily-reminders', '0 16 * * *', $$select public.queue_daily_reminders()$$);
