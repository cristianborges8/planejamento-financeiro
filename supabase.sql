-- Rode no Supabase: SQL Editor > New query. Troque os 2 e-mails pelos de vocês.
create table if not exists household (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table household enable row level security;

create policy "casal le" on household for select to authenticated
  using ((auth.jwt()->>'email') in ('seu-email@exemplo.com','email-do-parceiro@exemplo.com'));
create policy "casal insere" on household for insert to authenticated
  with check ((auth.jwt()->>'email') in ('seu-email@exemplo.com','email-do-parceiro@exemplo.com'));
create policy "casal atualiza" on household for update to authenticated
  using ((auth.jwt()->>'email') in ('seu-email@exemplo.com','email-do-parceiro@exemplo.com'))
  with check ((auth.jwt()->>'email') in ('seu-email@exemplo.com','email-do-parceiro@exemplo.com'));
