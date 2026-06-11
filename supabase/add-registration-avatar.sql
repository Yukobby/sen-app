-- ① アバター列を追加（絵文字文字列、デフォルトは📚）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '📚';

-- ② 登録番号列を追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_number INTEGER;

-- ③ 既存ユーザーに登録順で番号を振る（created_at 昇順）
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST) AS rn
  FROM public.profiles
)
UPDATE public.profiles
SET registration_number = ranked.rn
FROM ranked
WHERE public.profiles.id = ranked.id;

-- ④ 新規ユーザー登録時に自動で番号を付与するトリガー
CREATE OR REPLACE FUNCTION public.assign_registration_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_number IS NULL THEN
    NEW.registration_number := (
      SELECT COALESCE(MAX(registration_number), 0) + 1
      FROM public.profiles
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assign_reg_num ON public.profiles;
CREATE TRIGGER trg_assign_reg_num
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_registration_number();
