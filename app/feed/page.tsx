'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import PostCard from '@/components/PostCard'

const PAGE_SIZE = 24

type FilterType = 'all' | 'manga' | 'anime'
type ViewMode   = 'card' | 'feed'

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         className={`w-4 h-4 transition ${active ? 'text-text' : 'text-sub2'}`}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}
function ListIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         className={`w-4 h-4 transition ${active ? 'text-text' : 'text-sub2'}`}>
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill="currentColor"/>
      <circle cx="3" cy="12" r="1" fill="currentColor"/>
      <circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  )
}

function FeedPageContent() {
  const searchParams   = useSearchParams()
  const initFilter     = (searchParams.get('filter') as FilterType) ?? 'all'

  const [posts,         setPosts]        = useState<Post[]>([])
  const [profilesMap,   setProfilesMap]  = useState<Record<string, string>>({})
  const [likeCountMap,  setLikeCountMap] = useState<Record<string, number>>({})
  const [likedByMe,     setLikedByMe]    = useState<Set<string>>(new Set())
  const [filter,        setFilter]       = useState<FilterType>(initFilter)
  const [viewMode,      setViewMode]     = useState<ViewMode>('card')
  const [loading,       setLoading]      = useState(true)
  const [loadingMore,   setLoadingMore]  = useState(false)
  const [hasMore,       setHasMore]      = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()
  const offsetRef = useRef(0)  // offset を ref で管理して race condition を防ぐ
  const gridRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id))
  }, [])

  // ── フィルター変更 → リセット＆再取得 ──────────────────
  // 2つの useEffect に分けると race condition が起きるので 1つにまとめる
  useEffect(() => {
    let cancelled = false
    offsetRef.current = 0
    setPosts([])
    setHasMore(true)
    setLoading(true)

    fetchPage(0, true, cancelled).then(result => {
      if (cancelled) return
      applyResult(result, true)
    })

    return () => { cancelled = true }
  }, [filter, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── post-card を IntersectionObserver で可視化 ──────────
  useEffect(() => {
    if (loading || !gridRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          ;(entry.target as HTMLElement).classList.add('visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.05 }
    )
    gridRef.current.querySelectorAll('.post-card').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [loading, posts.length])

  // ── ページ単位フェッチ（filter クロージャに依存しない純関数） ──
  async function fetchPage(from: number, reset: boolean, _cancelled: boolean) {
    let q = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (filter !== 'all') q = q.eq('category', filter)

    const { data } = await q
    const fetched  = data ?? []

    const postIds = fetched.map(p => p.id)
    const userIds = [...new Set(fetched.map(p => p.user_id))]

    const [profilesRes, likesRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from('profiles').select('id, username').in('id', userIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from('likes').select('post_id, user_id').in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ])

    const profiles: Record<string, string> = Object.fromEntries(
      (profilesRes.data || []).map((p: any) => [p.id, p.username || ''])
    )
    const counts: Record<string, number> = {}
    const myLikes = new Set<string>()
    for (const like of (likesRes.data || []) as any[]) {
      counts[like.post_id] = (counts[like.post_id] || 0) + 1
      if (currentUserId && like.user_id === currentUserId) myLikes.add(like.post_id)
    }

    return { fetched, profiles, counts, myLikes, more: fetched.length === PAGE_SIZE, nextOffset: from + fetched.length }
  }

  function applyResult(
    result: Awaited<ReturnType<typeof fetchPage>>,
    reset: boolean
  ) {
    const { fetched, profiles, counts, myLikes, more, nextOffset } = result
    if (reset) {
      setPosts(fetched)
      setProfilesMap(profiles)
      setLikeCountMap(counts)
      setLikedByMe(myLikes)
    } else {
      setPosts(prev => [...prev, ...fetched])
      setProfilesMap(prev => ({ ...prev, ...profiles }))
      setLikeCountMap(prev => ({ ...prev, ...counts }))
      setLikedByMe(prev => { const s = new Set(prev); myLikes.forEach(id => s.add(id)); return s })
    }
    offsetRef.current = nextOffset
    setHasMore(more)
    setLoading(false)
    setLoadingMore(false)
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const result = await fetchPage(offsetRef.current, false, false)
    applyResult(result, false)
  }

  const handleLike = async (postId: string) => {
    if (!currentUserId) { window.location.href = '/login?next=/feed'; return }
    const already = likedByMe.has(postId)
    setLikedByMe(prev => { const s = new Set(prev); already ? s.delete(postId) : s.add(postId); return s })
    setLikeCountMap(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? -1 : 1)) }))
    if (already) await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId)
    else          await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId })
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',   label: 'すべて' },
    { key: 'manga', label: '漫画'   },
    { key: 'anime', label: 'アニメ' },
  ]

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-[1160px] mx-auto px-6 md:px-12 py-4 flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-sub hover:text-text transition text-sm font-medium flex items-center gap-1 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            ホーム
          </Link>

          <h1 className="font-black text-sm tracking-tight flex-shrink-0">みんなの投稿</h1>

          <div className="flex items-center gap-1.5">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  filter === key
                    ? 'bg-text text-bg'
                    : 'bg-surface2 border border-border2 text-sub hover:text-text hover:border-sub'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-sub2">{posts.length}{hasMore ? '+' : ''}件</span>
            )}
            <div className="flex items-center gap-1 bg-surface2 border border-border rounded-lg p-1">
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-surface border border-border2' : 'hover:bg-surface'}`}>
                <GridIcon active={viewMode === 'card'} />
              </button>
              <button onClick={() => setViewMode('feed')} className={`p-1.5 rounded transition ${viewMode === 'feed' ? 'bg-surface border border-border2' : 'hover:bg-surface'}`}>
                <ListIcon active={viewMode === 'feed'} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="max-w-[1160px] mx-auto px-6 md:px-12 py-8">
        {loading ? (
          <div className={viewMode === 'card'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'flex flex-col gap-2 max-w-2xl'
          }>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`bg-surface border border-border rounded-2xl animate-pulse ${viewMode === 'card' ? 'h-72' : 'h-28'}`} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-40 text-center">
            <p className="text-sub text-lg mb-6">まだ投稿がありません</p>
            <Link href="/post" className="inline-block bg-text text-bg font-bold px-8 py-3 rounded-xl hover:-translate-y-0.5 transition text-sm">
              最初の投稿をする →
            </Link>
          </div>
        ) : (
          <>
            <div
              ref={gridRef}
              className={viewMode === 'card'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
                : 'flex flex-col gap-2 max-w-2xl'
              }
            >
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  username={profilesMap[post.user_id]}
                  mode={viewMode}
                  likeCount={likeCountMap[post.id] ?? 0}
                  isLiked={likedByMe.has(post.id)}
                  onLike={() => handleLike(post.id)}
                />
              ))}
              {loadingMore && Array.from({ length: 3 }).map((_, i) => (
                <div key={`sk-${i}`} className={`bg-surface border border-border rounded-2xl animate-pulse ${viewMode === 'card' ? 'h-72' : 'h-28'}`} />
              ))}
            </div>

            {hasMore && !loadingMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMore}
                  className="px-8 py-3 rounded-xl border border-border2 text-sm font-semibold text-sub hover:text-text hover:border-sub transition"
                >
                  もっと読む
                </button>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="mt-10 text-center text-xs text-sub2">全 {posts.length} 件</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="grid grid-cols-3 gap-3 max-w-4xl w-full px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <FeedPageContent />
    </Suspense>
  )
}
