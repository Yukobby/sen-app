'use client'
// 学習ポイント: useSearchParams は Suspense でラップが必要 (Next.js App Router)

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import SwipeDeck from '@/components/SwipeDeck'

// デッキ定義
const DECKS = [
  { key: null,      label: 'すべて',   desc: '全ジャンルまとめて' },
  { key: 'manga',   label: '漫画',     desc: '漫画だけを集中スワイプ' },
  { key: 'anime',   label: 'アニメ',   desc: 'アニメだけを集中スワイプ' },
]

// ── 内部コンポーネント (useSearchParams を使う部分) ──
function SwipePageContent() {
  const searchParams = useSearchParams()
  const deck = searchParams.get('deck') ?? null

  const [posts,   setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userId,  setUserId]  = useState<string | undefined>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (deck) q = q.eq('category', deck)
    q.then(({ data }) => { setPosts(data || []); setLoading(false) })
  }, [deck])

  const currentDeck = DECKS.find(d => d.key === deck) ?? DECKS[0]

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* ヘッダー */}
      <header className="border-b border-border px-6 py-4 bg-bg/75 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sub hover:text-text transition text-sm font-medium flex items-center gap-1 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            戻る
          </Link>

          {/* ── デッキ切り替えタブ ── */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {DECKS.map((d) => (
              <Link
                key={d.key ?? 'all'}
                href={d.key ? `/swipe?deck=${d.key}` : '/swipe'}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                  (d.key === deck)
                    ? 'bg-text text-bg'
                    : 'bg-surface2 border border-border2 text-sub hover:text-text hover:border-sub'
                }`}
              >
                {d.label}
              </Link>
            ))}
          </div>

          {/* 件数 */}
          {!loading && (
            <span className="ml-auto text-xs text-sub2 flex-shrink-0">{posts.length}件</span>
          )}
        </div>
      </header>

      {/* メインエリア */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-[300px] h-[400px] bg-surface border border-border rounded-2xl animate-pulse" />
            <p className="text-sub text-sm">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-sub text-lg">まだ投稿がありません</p>
            <Link href="/post" className="inline-block bg-text text-bg font-bold px-6 py-3 rounded-xl text-sm hover:-translate-y-0.5 transition">
              最初の投稿をする →
            </Link>
          </div>
        ) : (
          <SwipeDeck
            posts={posts}
            userId={userId}
            deckLabel={deck ? currentDeck.label : undefined}
          />
        )}
      </main>
    </div>
  )
}

// Suspense ラッパー
export default function SwipePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-[300px] h-[400px] bg-surface border border-border rounded-2xl animate-pulse" />
      </div>
    }>
      <SwipePageContent />
    </Suspense>
  )
}
