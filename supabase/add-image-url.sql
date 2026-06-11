-- posts テーブルに image_url と description カラムを追加
-- seed-images.ts / seed-descriptions.ts を実行する前にこれを実行すること

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS description TEXT;
