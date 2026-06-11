'use client'

import { useEffect, useState } from 'react'
import { supabase, Post, Collection } from '@/lib/supabase'
import Link from 'next/link'
import PostCard from '@/components/PostCard'
import CategoryBadge from '@/components/CategoryBadge'

type TabType = 'all' | 'save' | 'god'
type FilterType = 'all' | 'manga' | 'anime'

// ── アイコン ──
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/>
    </svg>
  )
}
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}

export default function CollectionPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [tab,         setTab]         = useState<TabType>('all')
  const [filter,      setFilter]      = useState<FilterType>('all')

  // post-card の fade-in アニメーション用 IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.05 }
    )
    document.querySelectorAll('.post-card').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }
      setUserId(data.user.id)

      // collections + posts を JOIN して取得
      const { data: cols } = await supabase
        .from('collections')
        .select('*, posts(*)')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })

      setCollections((cols as Collection[]) || [])
      setLoading(false)
    })
  }, [])

  // フィルタリング
  const filtered = collections.filter(c => {
    const post = c.posts as Post
    if (tab !== 'all' && c.type !== tab) return false
    if (filter !== 'all' && post?.category !== filter) return false
    return true
  })

  const saveCount = collections.filter(c => c.type === 'save').length
  const godCount  = collections.filter(c => c.type === 'god').length

  const tabs: { key: TabType; label: string; icon?: React.ReactNode; color?: string }[] = [
    { key: 'all',  label: `すべて (${collections.length})` },
    { key: 'save', label: `コレクション (${saveCount})`,  icon: <HeartIcon />, color: 'text-save' },
    { key: 'god',  label: `殿堂入り (${godCount})`, icon: <StarIcon />,  color: 'text-god'  },
  ]
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',   label: 'すべて' },
    { key: 'manga', label: '漫画' },
    { key: 'anime', label: 'アニメ' },
  ]

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ヘッダー */}
      <header className="border-b border-border px-6 md:px-12 py-4 flex items-center gap-4 bg-bg/75 backdrop-blur-xl sticky top-0 z-10">
        <Link href="/" className="text-sub hover:text-text transition text-sm font-medium flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          ホーム
        </Link>
        <h1 className="text-[16px] font-extrabold tracking-tight">マイコレクション</h1>
      </header>

      <main className="max-w-[1160px] mx-auto px-6 md:px-12 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : !userId ? (
          /* 未ログイン */
          <div className="py-32 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-surface2 border border-border2 mx-auto flex items-center justify-center">
              <HeartIcon />
            </div>
            <h2 className="text-xl font-black tracking-tight">ログインが必要です</h2>
            <p className="text-sub text-sm">スワイプしてコレクションに追加した作品が表示されます。</p>
            <Link href="/post" className="inline-block bg-text text-bg font-bold px-8 py-3 rounded-xl text-sm hover:-translate-y-0.5 transition">
              ログイン / 新規登録
            </Link>
          </div>
        ) : collections.length === 0 ? (
          /* コレクションが空 */
          <div className="py-32 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-surface2 border border-border2 mx-auto flex items-center justify-center text-sub">
              <HeartIcon />
            </div>
            <h2 className="text-xl font-black tracking-tight">まだコレクションがありません</h2>
            <p className="text-sub text-sm max-w-xs mx-auto">
              スワイプ画面で右にスワイプ(SAVE)か上にスワイプ(殿堂入り)すると、ここに追加されます。
            </p>
            <Link href="/swipe" className="inline-block bg-text text-bg font-bold px-8 py-3 rounded-xl text-sm hover:-translate-y-0.5 transition">
              スワイプを始める →
            </Link>
          </div>
        ) : (
          <>
            {/* タブ */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {tabs.map(({ key, label, icon, color }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    tab === key
                      ? 'bg-text text-bg'
                      : 'bg-surface2 border border-border2 text-sub hover:text-text hover:border-sub'
                  }`}
                >
                  {icon && <span className={tab === key ? 'text-bg' : color}>{icon}</span>}
                  {label}
                </button>
              ))}
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {filters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    filter === key
                      ? 'bg-surface border border-border2 text-text'
                      : 'text-sub2 hover:text-sub'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* グリッド */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sub text-sm">
                このフィルターに一致するアイテムがありません
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((col) => {
                  const post = col.posts as Post
                  if (!post) return null
                  return (
                    <div key={col.id} className="relative">
                      {/* タイプバッジ */}
                      <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${
                        col.type === 'god'
                          ? 'bg-god/20 border border-god/30 text-god'
                          : 'bg-save/20 border border-save/30 text-save'
                      }`}>
                        {col.type === 'god' ? <StarIcon /> : <HeartIcon />}
                        {col.type === 'god' ? '殿堂入り' : 'コレクション'}
                      </div>
                      <PostCard post={post} />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
