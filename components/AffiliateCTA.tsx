'use client'
// SAVE後 / 殿堂入り後に画面下から出てくるアフィリエイトCTAパネル
// 学習ポイント: Tailwindの transition + translate でスライドアニメーション
// JS で状態を持つので 'use client' が必要

import { useEffect } from 'react'
import { Post } from '@/lib/supabase'
import { getAffLinks } from '@/lib/affiliate'

type SwipeDir = 'right' | 'up'

type Props = {
  post: Post | null         // null のとき非表示
  dir: SwipeDir | null      // 'right'=SAVE, 'up'=殿堂入り
  onClose: () => void
}

// 外部リンクアイコン
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 flex-shrink-0">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function AffiliateCTA({ post, dir, onClose }: Props) {
  const visible = post !== null

  // 4秒後に自動クローズ
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onClose, 4200)
    return () => clearTimeout(t)
  }, [visible, post, onClose])

  const links = post ? getAffLinks(post.title, post.category) : []
  const headline = dir === 'up' ? '殿堂入り！' : 'コレクションに追加しました'
  const headlineColor = dir === 'up' ? 'text-god' : 'text-save'

  return (
    // 学習ポイント: fixed + bottom + translate
    // translate-y-full で画面外に隠し、visible のとき translate-y-0 でスライドアップ
    <div
      className={`
        fixed left-1/2 bottom-6 z-50
        w-[min(420px,calc(100vw-32px))]
        -translate-x-1/2
        transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]
        ${visible ? 'translate-y-0' : 'translate-y-[calc(100%+32px)]'}
      `}
      role="dialog"
      aria-live="polite"
    >
      <div className="bg-surface border border-border2 rounded-2xl p-4 shadow-[0_24px_60px_rgba(0,0,0,.65)]">
        {/* ヘッダー */}
        <div className="flex items-start gap-3 mb-4">
          <span className={`
            w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
            ${dir === 'up' ? 'bg-god text-bg' : 'bg-save text-bg'}
          `}>
            <CheckIcon />
          </span>
          <div>
            <p className={`text-sm font-extrabold ${headlineColor}`}>{headline}</p>
            {post && (
              <p className="text-xs text-sub mt-0.5 leading-snug">
                {post.title} の続きが気になったら——
              </p>
            )}
          </div>
          <button onClick={onClose} className="ml-auto text-sub2 hover:text-sub p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* アフィリエイトボタン一覧 */}
        <div className="flex gap-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                text-[12px] font-bold transition-all duration-200
                ${link.primary
                  ? 'bg-text text-bg hover:-translate-y-0.5 hover:shadow-md'
                  : 'bg-surface2 text-sub border border-border2 hover:text-text'}
              `}
            >
              {link.label}
              <ExternalIcon />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
