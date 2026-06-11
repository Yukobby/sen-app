-- likes テーブル
-- 投稿へのいいね。user_id + post_id でユニーク (1人1回のみ)

create table if not exists public.likes (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  post_id    uuid references public.posts(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, post_id)
);

alter table public.likes enable row level security;

-- 自分のいいねは誰でも見られる (集計のため)
create policy "Anyone can view likes"
  on public.likes for select using (true);

-- いいね追加/削除は自分のレコードのみ
create policy "Users can manage their own likes"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on public.likes for delete using (auth.uid() = user_id);
