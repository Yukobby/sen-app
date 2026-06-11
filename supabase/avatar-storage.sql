-- アバター画像用のStorageバケットを作成
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

-- 誰でも閲覧可能
create policy "avatars_public_read"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- ログイン済みユーザーが自分のフォルダにのみアップロード可
create policy "avatars_user_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 自分のファイルのみ上書き可
create policy "avatars_user_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 自分のファイルのみ削除可
create policy "avatars_user_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
