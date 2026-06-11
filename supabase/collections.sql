-- collections テーブル
-- ユーザーがスワイプでSAVE/殿堂入りにした投稿を永続化する

create table if not exists public.collections (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  post_id    uuid references public.posts(id) on delete cascade not null,
  type       text check (type in ('save', 'god')) not null default 'save',
  created_at timestamptz default now() not null,
  unique(user_id, post_id)   -- 同じ投稿を2回保存できない
);

-- RLS: 自分のレコードだけ読み書き可能
alter table public.collections enable row level security;

create policy "Users can manage their own collections"
  on public.collections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
