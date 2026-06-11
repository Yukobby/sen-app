create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  message    text not null,
  page       text,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

-- 誰でも投稿可（未ログインも可）
create policy "feedback_insert" on public.feedback
  for insert with check (true);

-- 自分の投稿だけ閲覧可
create policy "feedback_select" on public.feedback
  for select using (auth.uid() = user_id);
