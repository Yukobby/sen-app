-- posts テーブルに description カラムを追加
-- Google Books / Jikan API から取得した公式あらすじを保存する
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS description TEXT;
