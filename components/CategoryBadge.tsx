// 学習ポイント: コンポーネントを小さく切り出す理由
// ① 再利用できる (PostCard, SwipeDeck どちらでも使える)
// ② 変更箇所が1ヶ所で済む (ジャンル追加時に map を足すだけ)
// ③ 関心の分離 — 「バッジの見た目」だけを責任として持つ

type Props = {
  category: string
  size?: 'sm' | 'md'
}

// ジャンル → 表示ラベルの対応表
// 将来のジャンル追加はここに足すだけ
const LABEL_MAP: Record<string, string> = {
  manga:  '漫画',
  anime:  'アニメ',
  gadget: 'ガジェット',
  book:   '本',
  music:  '音楽',
  game:   'ゲーム',
}

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  const label = LABEL_MAP[category] ?? category

  // 学習ポイント: テンプレートリテラルで条件付きクラスを組み立てる
  const base = 'inline-flex items-center border border-border2 bg-surface2 text-sub font-bold uppercase tracking-wide rounded'
  const sizeClass = size === 'md' ? 'text-[11px] px-3 py-1 gap-1.5' : 'text-[10px] px-2.5 py-0.5 gap-1'

  return (
    <span className={`${base} ${sizeClass}`}>
      {label}
    </span>
  )
}
