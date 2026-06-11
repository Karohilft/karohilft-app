-- Dateianhänge zu Betreuern (z.B. Führerschein, Vollmacht, sonstige Dokumente)
-- Im Supabase SQL-Editor ausführen.

insert into storage.buckets (id, name, public)
values ('caregiver-files', 'caregiver-files', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated read caregiver-files" on storage.objects;
create policy "Authenticated read caregiver-files" on storage.objects
  for select using (bucket_id = 'caregiver-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated write caregiver-files" on storage.objects;
create policy "Authenticated write caregiver-files" on storage.objects
  for insert with check (bucket_id = 'caregiver-files' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete caregiver-files" on storage.objects;
create policy "Authenticated delete caregiver-files" on storage.objects
  for delete using (bucket_id = 'caregiver-files' and auth.role() = 'authenticated');
