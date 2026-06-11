'use client'
// 学習ポイント: コンポーネントの props 設計
// mode で表示形式を切り替え → 同じデータを異なるUIで使い回せる
// onLike を親から受け取ることで、状態管理を親に集約できる

import { Post } from '@/lib/supabase'
import CategoryBadge from './CategoryBadge'

// ── アイコン ──────────────────────────────────────
function BookIcon({ small }: { small?: boolean }) {
  const cls = small ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`${cls} text-sub2`}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  )
}
function VideoIcon({ small }: { small?: boolean }) {
  const cls = small ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`${cls} text-sub2`}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  )
}

// いいねボタン用ハートアイコン
function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      className={className ?? 'w-4 h-4'}
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

const PLACEHOLDER_GRADIENT: Record<string, string> = {
  manga:  'linear-gradient(135deg,#1c1c1c,#2a1f10)',
  anime:  'linear-gradient(135deg,#0d1a1c,#112228)',
  gadget: 'linear-gradient(135deg,#1a1a1a,#222)',
}

export type PostCardProps = {
  post: Post
  username?: string
  mode?: 'card' | 'feed'   // 'card'=グリッド表示 / 'feed'=タイムライン表示
  likeCount?: number
  isLiked?: boolean
  onLike?: () => void
}

export default function PostCard({
  post, username,
  mode = 'card',
  likeCount = 0,
  isLiked = false,
  onLike,
}: PostCardProps) {
  const gradientBg  = PLACEHOLDER_GRADIENT[post.category] ?? PLACEHOLDER_GRADIENT.manga
  const displayName = username || 'ユーザー'
  const initials    = username
    ? username.slice(0, 2).toUpperCase()
    : (post.user_id ?? '?').slice(-4, -2).toUpperCase() || '?'

  // ── いいねボタン (共通) ──
  const LikeButton = () => (
    <button
      onClick={(e) => { e.stopPropagation(); onLike?.() }}
      className={`flex items-center gap-1.5 text-[12px] font-bold transition-all hover:scale-110 active:scale-95 ${
        isLiked ? 'text-save' : 'text-sub2 hover:text-sub'
      }`}
      aria-label="いいね"
    >
      <HeartIcon
        filled={isLiked}
        className={`transition-transform ${isLiked ? 'text-save' : ''} w-4 h-4`}
      />
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  )

  // ────────────────────────────────────────────────
  // CARD モード (グリッド表示)
  // ────────────────────────────────────────────────
  if (mode === 'card') {
    return (
      <div className="post-card group bg-surface border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-border2 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,.5)] transition-all">
        {/* 4:3 画像エリア */}
        <div className="w-full overflow-hidden bg-surface2" style={{ aspectRatio: '4/3' }}>
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: gradientBg }}>
              {post.category === 'anime' ? <VideoIcon /> : <BookIcon />}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <CategoryBadge category={post.category} />
            <span className="text-[11px] text-sub2">{formatRelativeTime(post.created_at)}</span>
          </div>
          <h3 className="text-[15px] font-extrabold leading-tight tracking-tight mb-1.5">{post.title}</h3>
          {post.comment && (
            <p className="text-[12px] text-sub leading-relaxed line-clamp-2">{post.comment}</p>
          )}
          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-[9px] font-black text-sub">
                {initials}
              </div>
              <span className="text-[11px] font-semibold text-sub">{displayName}</span>
            </div>
            <LikeButton />
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────
  // FEED モード (タイムライン表示)
  // ────────────────────────────────────────────────
  return (
    <div className="post-card group bg-surface border border-border rounded-xl p-4 hover:border-border2 hover:bg-surface/80 transition-all cursor-pointer">
      {/* ヘッダー行: アバター + ユーザー名 + バッジ + 時刻 */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-[10px] font-black text-sub flex-shrink-0">
          {initials}
        </div>
        <span className="text-[12px] font-semibold text-sub">{displayName}</span>
        <CategoryBadge category={post.category} size="sm" />
        <span className="ml-auto text-[11px] text-sub2 flex-shrink-0">{formatRelativeTime(post.created_at)}</span>
      </div>

      {/* コンテンツ行: テキスト + サムネイル */}
      <div className="flex gap-4">
        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-extrabold leading-tight tracking-tight mb-1.5">{post.title}</h3>
          {post.comment && (
            <p className="text-[13px] text-sub leading-relaxed line-clamp-3">{post.comment}</p>
          )}
        </div>

        {/* サムネイル (あれば右端に小さく) */}
        {post.image_url && (
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        {!post.image_url && (
          <div
            className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center border border-border"
            style={{ background: gradientBg }}
          >
            {post.category === 'anime' ? <VideoIcon small /> : <BookIcon small />}
          </div>
        )}
      </div>

      {/* フッター: いいね */}
      <div className="flex items-center mt-3 pt-3 border-t border-border/60">
        <LikeButton />
      </div>
    </div>
  )
}

// 相対時間フォーマット
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7)  return `${days}日前`
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}
