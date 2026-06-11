'use client'
// 学習ポイント: 'use client' vs Server Component
// データフェッチだけなら Server Component でもよいが、
// IntersectionObserver などブラウザ API が必要なので 'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import PostCard from '@/components/PostCard'
import type { User } from '@supabase/supabase-js'

// ── 浮遊カードの位置・アニメーション定義 ──────────────
// cosmos.so スタイル: viewport の端に散らばり、ゆっくり上下に漂う
// 中央テキストエリアを避けるため x は 0-20% または 75-95% に集中させる
const FLOAT_CONFIGS = [
  // 左列
  { x: 3,  y: 8,  rot: -14, size: 88,  anim: 'a', dur: 9.2,  delay: 0    },
  { x: 6,  y: 31, rot:  7,  size: 72,  anim: 'b', dur: 11.5, delay: 1.4  },
  { x: 1,  y: 56, rot: -5,  size: 104, anim: 'c', dur: 8.8,  delay: 2.9  },
  { x: 5,  y: 79, rot:  12, size: 76,  anim: 'a', dur: 10.4, delay: 0.7  },
  // 右列
  { x: 87, y: 6,  rot:  10, size: 92,  anim: 'b', dur: 10.1, delay: 2.0  },
  { x: 91, y: 28, rot: -8,  size: 68,  anim: 'c', dur: 9.6,  delay: 3.4  },
  { x: 85, y: 53, rot:  15, size: 96,  anim: 'a', dur: 12.2, delay: 0.9  },
  { x: 90, y: 75, rot: -11, size: 66,  anim: 'b', dur: 8.4,  delay: 4.2  },
  // 上部散在 (薄め)
  { x: 21, y: 4,  rot: -3,  size: 60,  anim: 'c', dur: 11.0, delay: 2.4  },
  { x: 73, y: 8,  rot:  7,  size: 78,  anim: 'a', dur: 9.4,  delay: 0.5  },
  // 下部散在 (薄め)
  { x: 16, y: 87, rot:  9,  size: 80,  anim: 'b', dur: 10.7, delay: 3.8  },
  { x: 71, y: 83, rot: -13, size: 62,  anim: 'c', dur: 8.1,  delay: 1.7  },
]

// ── ヒーロー (Apple Vision Pro / M4 Mac スタイル) ──────
// デザイン方針:
// - 純黒に複数のラジアルグラデーション（深みと奥行き）
// - 中央の強いライトビーム（conic-gradient × ブラー）
// - 左右非対称グロー（青紫・ティール）
// - 背景3Dカード: 実際のカードっぽい構造（縁線・ヘッダー帯・コンテンツライン）
// - タイポグラフィはジャンプ率を極端に
// - CTAは白いピル型ボタン
function Hero({ bgPosts }: { bgPosts?: Post[] }) {
  return (
    <section
      className="relative min-h-[80svh] md:min-h-[100svh] flex flex-col items-center justify-center px-6 py-16 md:py-32 text-center overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* ── 背景レイヤー1: 深みのあるグロー ── */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, #0d0d1a 0%, #000 65%)' }} />

      {/* ── 背景レイヤー2: 左上ブルーグロー ── */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 55% 45% at 15% 30%, rgba(60,80,180,0.18) 0%, transparent 70%)' }} />

      {/* ── 背景レイヤー3: 右下ティールグロー ── */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 40% at 85% 75%, rgba(20,120,100,0.14) 0%, transparent 70%)' }} />

      {/* ── 背景レイヤー4: 中央スポットライト (ライトビーム) ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '50%',
          transform: 'translateX(-50%)',
          width: '120%', height: '90%',
          background: 'conic-gradient(from 260deg at 50% 0%, transparent 30%, rgba(180,180,255,0.04) 45%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      {/* ── 背景レイヤー5: 水平ライン (微妙なグリッド感) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '100% 80px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 75%)',
        }}
      />

      {/* ── 背景: 浮遊カード (cosmos.so スタイル) ──
          FLOAT_CONFIGS の位置に散らばり、CSS animation でゆっくり漂う。
          外側 div: 絶対位置 + 傾き (rotate)
          内側 div: bg-float-* クラスで上下フロート
          画像あり → cover、画像なし → グラデーションプレースホルダー */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {FLOAT_CONFIGS.map((cfg, i) => {
          const post = bgPosts?.[i]
          const isEdge = cfg.x < 22 || cfg.x > 72  // 端のカードは不透明度高め
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${cfg.x}%`,
                top: `${cfg.y}%`,
                width: cfg.size,
                height: cfg.size,
                transform: `rotate(${cfg.rot}deg)`,
              }}
            >
              <div
                className={`bg-float-${cfg.anim}`}
                style={{
                  '--dur': `${cfg.dur}s`,
                  '--delay': `${cfg.delay}s`,
                  width: '100%',
                  height: '100%',
                } as any}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: post?.image_url
                      ? 'transparent'
                      : i % 3 === 0
                        ? 'linear-gradient(145deg,#1c1a10,#0a0a0a)'
                        : i % 3 === 1
                          ? 'linear-gradient(145deg,#0d1a14,#0a0a0a)'
                          : 'linear-gradient(145deg,#181828,#0a0a0a)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
                    opacity: isEdge ? 0.55 : 0.35,
                  }}
                >
                  {post?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── コンテンツ ── */}
      <div className="relative z-10 flex flex-col items-center">
        {/* eyebrow */}
        <div className="fade-up mb-8 flex items-center gap-2">
          <div style={{ width: 20, height: 1, background: 'rgba(134,134,139,0.5)' }} />
          <p className="font-semibold tracking-[.14em] uppercase"
             style={{ fontSize: 12, color: '#86868B' }}>
            Archive your favorites.
          </p>
          <div style={{ width: 20, height: 1, background: 'rgba(134,134,139,0.5)' }} />
        </div>

        {/* サブ見出し */}
        <p
          className="fade-up font-semibold leading-tight mb-2"
          style={{ fontSize: 'clamp(20px, 3vw, 32px)', color: '#6e6e73', letterSpacing: '-0.02em' }}
        >
          まだ知らない名作を、
        </p>

        {/* メイン見出し */}
        <h1
          className="fade-up font-black leading-none text-white mb-14"
          style={{
            fontSize: 'clamp(72px, 12vw, 130px)',
            letterSpacing: '-0.045em',
            lineHeight: 1.0,
            textShadow: '0 0 120px rgba(200,200,255,0.08)',
          }}
        >
          スワイプで。
        </h1>

        {/* CTA */}
        <div className="fade-up flex flex-col sm:flex-row gap-3 items-center">
          <Link
            href="/post"
            className="inline-flex items-center gap-1.5 font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: '#fff',
              color: '#000',
              padding: '15px 30px',
              borderRadius: 999,
              fontSize: 15,
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e8e8ed')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            コレクションをはじめる
          </Link>
          <Link
            href="/swipe"
            className="font-semibold transition-colors hover:text-white inline-flex items-center gap-1"
            style={{ fontSize: 15, color: '#86868B', letterSpacing: '-0.01em' }}
          >
            スワイプで探す
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* スクロールヒント */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce"
           style={{ color: '#444', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
        SCROLL
      </div>
    </section>
  )
}

// ── デッキクイックタブバー ────────────────────────
// ヒーロー直下に固定。スワイプページへのショートカット。
// sticky で nav の下にくっついてスクロール追従する。
// アクティブなデッキだけタブに表示 (DeckSection と同期)
const DECK_TABS = [
  { href: '/swipe',             label: 'すべて',      available: true  },
  { href: '/swipe?deck=manga',  label: '漫画',        available: true  },
  { href: '/swipe?deck=anime',  label: 'アニメ',      available: true  },
  { href: '#',                  label: 'ライトノベル', available: false },
  { href: '#',                  label: '映画',        available: false },
  { href: '#',                  label: 'ゲーム',      available: false },
]

function DeckTabsBar() {
  return (
    <div
      className="sticky z-40 border-b border-border"
      style={{ top: '57px', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px) saturate(180%)' }}
    >
      <div className="max-w-[1160px] mx-auto px-6 md:px-12 flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mr-2 flex-shrink-0">
          デッキ
        </span>
        {DECK_TABS.map(tab => (
          tab.available ? (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-border2 text-sub hover:text-text hover:border-sub transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-2.5 h-2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              {tab.label}
            </Link>
          ) : (
            <span
              key={tab.label}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-border text-sub2 opacity-50 cursor-not-allowed"
            >
              {tab.label}
            </span>
          )
        ))}
        <div className="ml-auto flex-shrink-0 pl-4">
          <Link
            href="/swipe"
            className="text-[11px] font-bold text-sub2 hover:text-sub transition whitespace-nowrap"
          >
            スワイプページへ →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── スタッツバー ──────────────────────────────────
// 投稿数・いいね総数をアピール。数字が大きければ大きいほど説得力がある。
type StatsData = { posts: number; likes: number; users: number }

function StatsBar({ stats }: { stats: StatsData }) {
  const items = [
    { value: stats.posts, label: '投稿作品', suffix: '' },
    { value: stats.likes, label: 'いいね',   suffix: '' },
    { value: stats.users, label: 'ユーザー', suffix: '' },
  ]
  return (
    <div className="border-y border-border">
      <div className="max-w-[1160px] mx-auto px-6 md:px-12 py-6 md:py-10 grid grid-cols-3 gap-4 text-center">
        {items.map(({ value, label, suffix }) => (
          <div key={label}>
            <p className="font-black leading-none mb-1"
               style={{ fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.04em' }}>
              {value.toLocaleString()}{suffix}
            </p>
            <p className="text-sub text-xs font-semibold tracking-widest uppercase">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 横スクロール投稿ロー ────────────────────────────
// 人気投稿・新着作品などに再利用するコンポーネント
// overflow-x: auto + scrollbar-none でスマホ/PCどちらでも横スクロール可
function HorizontalPostRow({
  eyebrow, title, posts, likeCountMap, currentUserId,
}: {
  eyebrow: string
  title: string
  posts: Post[]
  likeCountMap: Record<string, number>
  currentUserId?: string
}) {
  const [likedByMe, setLikedByMe] = useState(new Set<string>())

  const handleLike = async (postId: string) => {
    if (!currentUserId) { window.location.href = '/login?next=/'; return }
    const already = likedByMe.has(postId)
    setLikedByMe(prev => { const n = new Set(prev); already ? n.delete(postId) : n.add(postId); return n })
    if (already) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId)
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId })
    }
  }

  if (posts.length === 0) return null

  return (
    <section className="pb-16">
      <div className="max-w-[1160px] mx-auto">
        {/* セクションヘッダー */}
        <div className="px-6 md:px-12 mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mb-1">{eyebrow}</p>
            <h2 className="font-black tracking-tight leading-tight"
                style={{ fontSize: 'clamp(22px, 3.2vw, 36px)', letterSpacing: '-1.2px' }}>
              {title}
            </h2>
          </div>
          <Link href="/" className="text-[12px] font-semibold text-sub hover:text-text transition">
            全て見る →
          </Link>
        </div>

        {/* 横スクロールカードリスト
            -mx と px のトリックで端まで見えるように: コンテナをはみ出させつつパディングで余白確保 */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none px-6 md:px-12 pb-2">
          {posts.map(post => (
            <div key={post.id} className="flex-shrink-0" style={{ width: 190 }}>
              <PostCard
                post={post}
                mode="card"
                likeCount={likeCountMap[post.id] ?? 0}
                isLiked={likedByMe.has(post.id)}
                onLike={() => handleLike(post.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── フィードセクション ────────────────────────────
type FilterType  = 'all' | 'manga' | 'anime'
type ViewMode    = 'card' | 'feed'

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
      <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/>
      <circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  )
}

function FeedSection({ currentUserId }: { currentUserId?: string }) {
  const [posts,        setPosts]       = useState<Post[]>([])
  const [profilesMap,  setProfilesMap] = useState<Record<string, string>>({})
  const [filter,       setFilter]      = useState<FilterType>('all')
  const [viewMode,     setViewMode]    = useState<ViewMode>('card')
  const [loading,      setLoading]     = useState(true)
  // いいね: { postId → count } と 自分のいいね済みセット
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({})
  const [likedByMe,    setLikedByMe]    = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('category', filter)
    q.then(async ({ data }) => {
      const fetched = data || []
      setPosts(fetched)

      const postIds = fetched.map(p => p.id)
      const userIds = [...new Set(fetched.map(p => p.user_id))]

      // プロフィールとLikesを並列取得
      const [profilesRes, likesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, username').in('id', userIds)
          : Promise.resolve({ data: [] }),
        postIds.length > 0
          ? supabase.from('likes').select('post_id, user_id').in('post_id', postIds)
          : Promise.resolve({ data: [] }),
      ])

      // プロフィールマップ
      setProfilesMap(Object.fromEntries(
        (profilesRes.data || []).map((p: any) => [p.id, p.username || ''])
      ))

      // いいね集計
      const countMap: Record<string, number> = {}
      const myLikes = new Set<string>()
      for (const like of (likesRes.data || []) as any[]) {
        countMap[like.post_id] = (countMap[like.post_id] || 0) + 1
        if (currentUserId && like.user_id === currentUserId) myLikes.add(like.post_id)
      }
      setLikeCountMap(countMap)
      setLikedByMe(myLikes)
      setLoading(false)
    })
  }, [filter, currentUserId])

  // いいねトグル (オプティミスティック更新)
  // 学習ポイント: UIを即時更新してからDB処理 → レスポンスが速く感じる
  const handleLike = async (postId: string) => {
    if (!currentUserId) {
      window.location.href = '/login?next=/'
      return
    }
    const already = likedByMe.has(postId)
    // オプティミスティック更新
    setLikedByMe(prev => {
      const next = new Set(prev)
      already ? next.delete(postId) : next.add(postId)
      return next
    })
    setLikeCountMap(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (already ? -1 : 1)),
    }))
    // DB更新
    if (already) {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId)
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId })
    }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',   label: 'すべて' },
    { key: 'manga', label: '漫画' },
    { key: 'anime', label: 'アニメ' },
  ]

  return (
    <section className="pb-10">
      <div className="max-w-[1160px] mx-auto px-6 md:px-12">
        {/* コントロールバー: タイトル + フィルター + 表示切り替え */}
        <div className="fade-up flex items-center gap-2 mb-4 flex-wrap">
          <h2 className="font-black text-base tracking-tight mr-2">みんなの投稿</h2>
          {/* カテゴリフィルター */}
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

          {/* 表示切り替えトグル */}
          <div className="ml-auto flex items-center gap-1 bg-surface2 border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition ${viewMode === 'card' ? 'bg-surface border border-border2' : 'hover:bg-surface'}`}
              title="グリッド表示"
            >
              <GridIcon active={viewMode === 'card'} />
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`p-1.5 rounded transition ${viewMode === 'feed' ? 'bg-surface border border-border2' : 'hover:bg-surface'}`}
              title="タイムライン表示"
            >
              <ListIcon active={viewMode === 'feed'} />
            </button>
          </div>
        </div>

        {/* 投稿一覧 */}
        {loading ? (
          <div className={viewMode === 'card'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'flex flex-col gap-2 max-w-2xl'
          }>
            {[1,2,3].map(i => (
              <div key={i} className={`bg-surface border border-border rounded-2xl animate-pulse ${viewMode === 'card' ? 'h-72' : 'h-28'}`} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-sub text-lg mb-6">まだ投稿がありません</p>
            <Link
              href="/post"
              className="inline-block bg-text text-bg font-bold px-8 py-3 rounded-xl hover:-translate-y-0.5 transition text-sm"
            >
              最初の投稿をする →
            </Link>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                username={profilesMap[post.user_id]}
                mode="card"
                likeCount={likeCountMap[post.id] ?? 0}
                isLiked={likedByMe.has(post.id)}
                onLike={() => handleLike(post.id)}
              />
            ))}
          </div>
        ) : (
          /* タイムライン (feed) モード */
          <div className="flex flex-col gap-2 max-w-2xl">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                username={profilesMap[post.user_id]}
                mode="feed"
                likeCount={likeCountMap[post.id] ?? 0}
                isLiked={likedByMe.has(post.id)}
                onLike={() => handleLike(post.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── DISCOVER セクション ────────────────────────────
// ホームページ内のスワイプ体験プレビュー（非インタラクティブ）
// 左: コピー + 操作説明 + カウンター
// 右: 実際の投稿カードスタック（静的） + アクションボタン
// → スワイプしたい人を /swipe へ誘導
function DiscoverSection({ posts, stats }: { posts: Post[]; stats: StatsData }) {
  // 画像ありを優先して最大3枚取得
  const cardPosts = posts.filter(p => p.image_url).slice(0, 3)
  const frontPost = cardPosts[0]

  const hints = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
      label: 'SAVE',    desc: '気になる・好き',  color: '#54d68a',
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
      label: 'SKIP',    desc: 'パス',           color: '#ff6450',
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
      label: '殿堂入り', desc: '偏愛確定',       color: '#ffd700',
    },
  ] as const

  return (
    <section className="py-10 md:py-20 border-b border-border" id="discover">
      <div className="max-w-[1160px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── LEFT: コピー + ヒント + カウンター ── */}
          <div>
            <p className="fade-up text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mb-5">
              DISCOVER
            </p>
            <h2
              className="fade-up font-black leading-[1.05] tracking-tight mb-5"
              style={{ fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-2px' }}
            >
              偏愛を、<br />スワイプで。
            </h2>
            <p className="fade-up text-sub text-[15px] leading-relaxed mb-10 max-w-sm">
              直感でスワイプするだけ。<br />
              あなただけの「殿堂入り」コレクションが<br />
              できあがっていく。
            </p>

            {/* 操作ヒント */}
            <div className="fade-up flex flex-col gap-3 mb-10">
              {hints.map(({ icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}
                  >
                    {icon}
                  </div>
                  <div className="text-[13px] leading-tight">
                    <span className="font-bold text-text">スワイプ</span>
                    <span className="font-semibold mx-1.5" style={{ color }}>— {label}</span>
                    <span className="text-sub">{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* カウンター */}
            <div className="fade-up flex gap-8 pt-6 border-t border-border">
              <div>
                <p className="font-black text-2xl leading-none mb-0.5"
                   style={{ color: '#c8a84b', letterSpacing: '-0.04em' }}>
                  {stats.posts}
                </p>
                <p className="text-[11px] text-sub font-semibold tracking-wide uppercase">タイトル</p>
              </div>
              <div>
                <p className="font-black text-2xl leading-none mb-0.5"
                   style={{ color: '#54d68a', letterSpacing: '-0.04em' }}>
                  {stats.likes}
                </p>
                <p className="text-[11px] text-sub font-semibold tracking-wide uppercase">いいね</p>
              </div>
              <div>
                <p className="font-black text-2xl leading-none mb-0.5 text-text"
                   style={{ letterSpacing: '-0.04em' }}>
                  {stats.users}
                </p>
                <p className="text-[11px] text-sub font-semibold tracking-wide uppercase">ユーザー</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: カードスタック + ボタン ── */}
          <div className="fade-up flex flex-col items-center gap-7">

            {/* カードスタック (3枚重ね、静的) */}
            <div className="relative" style={{ width: 300, height: 405 }}>

              {/* 一番奥 */}
              <div
                className="absolute inset-0 rounded-[20px] overflow-hidden"
                style={{
                  transform: 'translateY(20px) scale(0.88) rotate(-2deg)',
                  opacity: 0.4, filter: 'blur(2px)', zIndex: 0,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {cardPosts[2]?.image_url
                  ? <img src={cardPosts[2].image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1a1a2e,#0c0c0c)' }} />
                }
              </div>

              {/* 中間 */}
              <div
                className="absolute inset-0 rounded-[20px] overflow-hidden"
                style={{
                  transform: 'translateY(10px) scale(0.94) rotate(3deg)',
                  opacity: 0.65, filter: 'blur(1px)', zIndex: 1,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {cardPosts[1]?.image_url
                  ? <img src={cardPosts[1].image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1a2e1a,#0c0c0c)' }} />
                }
              </div>

              {/* 最前面 */}
              <div
                className="absolute inset-0 rounded-[20px] overflow-hidden"
                style={{
                  zIndex: 2,
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                }}
              >
                {frontPost?.image_url
                  ? <img src={frontPost.image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl"
                         style={{ background: 'linear-gradient(135deg,#2a1a3e,#0c0c0c)' }}>📖</div>
                }
                {/* カード下グラデーション */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-5"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)' }}
                >
                  {frontPost && (
                    <>
                      <p className="font-bold text-[15px] text-white mb-1.5 leading-tight">{frontPost.title}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase"
                          style={frontPost.category === 'manga'
                            ? { background: 'rgba(200,168,75,0.2)', color: '#c8a84b', border: '1px solid rgba(200,168,75,0.3)' }
                            : { background: 'rgba(84,214,138,0.2)', color: '#54d68a', border: '1px solid rgba(84,214,138,0.3)' }
                          }
                        >
                          {frontPost.category === 'manga' ? 'MANGA' : 'ANIME'}
                        </span>
                        {frontPost.description && (
                          <span className="text-[11px] text-white/50 truncate max-w-[180px]">
                            {frontPost.description.slice(0, 28)}…
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* アクションボタン (見た目のみ) */}
            <div className="flex items-center gap-4">
              {/* SKIP */}
              <button
                className="flex items-center justify-center w-12 h-12 rounded-full border border-border2 bg-surface text-lg hover:bg-surface2 transition text-sub"
                tabIndex={-1}
              >
                ✕
              </button>
              {/* 殿堂入り */}
              <button
                className="flex items-center justify-center w-11 h-11 rounded-full border text-base hover:scale-105 transition"
                style={{ background: 'rgba(255,215,0,0.1)', borderColor: 'rgba(255,215,0,0.25)', color: '#ffd700' }}
                tabIndex={-1}
              >
                ⭐
              </button>
              {/* SAVE */}
              <button
                className="flex items-center justify-center w-14 h-14 rounded-full border text-2xl hover:scale-105 transition"
                style={{ background: 'rgba(84,214,138,0.12)', borderColor: 'rgba(84,214,138,0.3)', color: '#54d68a' }}
                tabIndex={-1}
              >
                ♡
              </button>
            </div>

            {/* 専用ページへのリンク */}
            <Link
              href="/swipe"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-sub hover:text-text transition"
            >
              全コレクションをスワイプ
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── デッキセクション ───────────────────────────────
// available: true  → 実際にスワイプできる
// available: false → 「準備中」バッジ付きで近日追加を告知
const DECKS = [
  {
    key: 'manga', label: '漫画', sublabel: 'Manga',
    desc: '王道からマニアックまで。あなたの次の一冊を見つけよう。',
    bg: 'linear-gradient(135deg,#1c1a10 0%,#0c0c0c 100%)',
    accent: '#c8a84b', available: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      </svg>
    ),
  },
  {
    key: 'anime', label: 'アニメ', sublabel: 'Anime',
    desc: '名作から話題作まで。次に観る一本を直感で選ぼう。',
    bg: 'linear-gradient(135deg,#0d1a1a 0%,#0c0c0c 100%)',
    accent: '#54d68a', available: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    ),
  },
  {
    key: 'novel', label: 'ライトノベル', sublabel: 'Light Novel',
    desc: '異世界から青春まで。没入感あふれる一冊を見つけよう。',
    bg: 'linear-gradient(135deg,#180d1e 0%,#0c0c0c 100%)',
    accent: '#b06be0', available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    key: 'movie', label: '映画', sublabel: 'Movie',
    desc: '名作からB級まで。あなたの映画体験を刻もう。',
    bg: 'linear-gradient(135deg,#0d0f1e 0%,#0c0c0c 100%)',
    accent: '#6b8ee0', available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <rect x="2" y="2" width="20" height="20" rx="2.18"/>
        <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/>
        <line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'game', label: 'ゲーム', sublabel: 'Game',
    desc: 'インディーから大作まで。プレイした熱量をアーカイブ。',
    bg: 'linear-gradient(135deg,#1a0e08 0%,#0c0c0c 100%)',
    accent: '#e07a40', available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
        <circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/>
        <path d="M6.5 6h11A3.5 3.5 0 0121 9.5v5A3.5 3.5 0 0117.5 18h-11A3.5 3.5 0 013 14.5v-5A3.5 3.5 0 016.5 6z"/>
      </svg>
    ),
  },
  {
    key: 'music', label: '音楽', sublabel: 'Music',
    desc: 'アルバムから楽曲まで。心に刻んだ音を記録しよう。',
    bg: 'linear-gradient(135deg,#0a1519 0%,#0c0c0c 100%)',
    accent: '#4bbfd6', available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
]

function DeckSection() {
  const activeDecks  = DECKS.filter(d => d.available)
  const comingDecks  = DECKS.filter(d => !d.available)

  return (
    <section className="pb-32">
      <div className="max-w-[1160px] mx-auto px-6 md:px-12">
        <p className="fade-up text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mb-5">
          デッキ
        </p>
        <h2 className="fade-up font-black leading-[1.05] tracking-tight mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', letterSpacing: '-1.8px' }}>
          テーマ別に探す
        </h2>
        <p className="fade-up text-sub text-[15px] leading-relaxed mb-10 max-w-sm">
          分野を絞ってスワイプ。気分に合ったデッキで発見を。
        </p>

        {/* アクティブデッキ: 大きいカード2列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {activeDecks.map((deck) => (
            <Link
              key={deck.key}
              href={`/swipe?deck=${deck.key}`}
              className="fade-up group relative overflow-hidden rounded-2xl border border-border hover:border-sub2 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,.5)]"
              style={{ background: deck.bg }}
            >
              <div className="p-8 flex flex-col gap-4 min-h-[200px]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                     style={{ background: `${deck.accent}18`, color: deck.accent, border: `1px solid ${deck.accent}30` }}>
                  {deck.icon}
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-widest uppercase mb-1"
                     style={{ color: deck.accent }}>{deck.sublabel}</p>
                  <h3 className="text-2xl font-black tracking-tight mb-2">{deck.label}</h3>
                  <p className="text-sub text-sm leading-relaxed">{deck.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-bold"
                     style={{ color: deck.accent }}>
                  スワイプで探す
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 group-hover:translate-x-1 transition">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
              <div className="absolute right-6 bottom-6 opacity-[0.06] scale-[3] origin-bottom-right pointer-events-none"
                   style={{ color: deck.accent }}>{deck.icon}</div>
            </Link>
          ))}
        </div>

        {/* 準備中デッキ: 小さいカード4列 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {comingDecks.map((deck) => (
            <div
              key={deck.key}
              className="fade-up relative overflow-hidden rounded-xl border border-border"
              style={{ background: deck.bg, opacity: 0.7 }}
            >
              <div className="p-5 flex flex-col gap-3">
                {/* 準備中バッジ */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                       style={{ background: `${deck.accent}12`, color: deck.accent, border: `1px solid ${deck.accent}25` }}>
                    {deck.icon}
                  </div>
                  <span className="text-[9px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded-full"
                        style={{ color: deck.accent, background: `${deck.accent}15`, border: `1px solid ${deck.accent}30` }}>
                    準備中
                  </span>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold tracking-widest uppercase mb-0.5"
                     style={{ color: deck.accent }}>{deck.sublabel}</p>
                  <h3 className="text-sm font-black tracking-tight">{deck.label}</h3>
                </div>
              </div>
              {/* 右下装飾 */}
              <div className="absolute right-3 bottom-3 opacity-[0.05] scale-[2] origin-bottom-right pointer-events-none"
                   style={{ color: deck.accent }}>{deck.icon}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── 最終 CTA セクション ──────────────────────────
function FinalCTA() {
  return (
    <section className="py-40 text-center">
      <div className="max-w-[1160px] mx-auto px-6 md:px-12">
        <p className="fade-up text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mb-6">
          はじめよう
        </p>
        <h2 className="fade-up font-black leading-none tracking-tight mb-6"
            style={{ fontSize: 'clamp(36px, 6vw, 68px)', letterSpacing: '-2.5px' }}>
          あなたの「好き」が、<br />
          <em className="not-italic text-sub">誰かの次の一冊になる。</em>
        </h2>
        <p className="fade-up text-sub text-[15px] leading-relaxed mb-12">
          無料で使えます。Googleアカウントで30秒ではじめられます。
        </p>
        <Link
          href="/post"
          className="fade-up inline-block bg-text text-bg font-extrabold px-10 py-4 rounded-xl text-sm tracking-wide hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(255,255,255,.1)] transition"
        >
          コレクションをはじめる →
        </Link>
      </div>
    </section>
  )
}

// ── メインページ ──────────────────────────────────
export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [myUsername,  setMyUsername]  = useState('')
  const [myAvatar,    setMyAvatar]    = useState('📚')
  const [stats,       setStats]       = useState<StatsData>({ posts: 0, likes: 0, users: 0 })
  // ヒーロー浮遊背景用: 画像ありの投稿を最大12件
  const [heroPosts,    setHeroPosts]    = useState<Post[]>([])
  // 人気投稿: いいね数でソート
  const [trendingPosts,     setTrendingPosts]     = useState<Post[]>([])
  const [trendingLikeCounts, setTrendingLikeCounts] = useState<Record<string,number>>({})
  // 新着作品
  const [newPosts, setNewPosts] = useState<Post[]>([])

  // ナビのログイン状態
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setCurrentUser(data.user ?? null)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles').select('username, avatar').eq('id', data.user.id).single()
        setMyUsername(profile?.username || '')
        setMyAvatar(profile?.avatar || '📚')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 統計データ取得
  useEffect(() => {
    Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('likes').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]).then(([postsRes, likesRes, usersRes]) => {
      setStats({
        posts: postsRes.count ?? 0,
        likes: likesRes.count ?? 0,
        users: usersRes.count ?? 0,
      })
    })
  }, [])

  // ヒーロー浮遊カード + 人気投稿 + 新着 を並列取得
  useEffect(() => {
    // 画像ありの投稿 (浮遊背景用)
    supabase.from('posts').select('*').not('image_url', 'is', null).limit(12)
      .then(({ data }) => setHeroPosts(data ?? []))

    // 新着 (created_at 降順)
    supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setNewPosts(data ?? []))

    // 人気投稿: 全いいねを取得してポスト側でカウント+ソート
    supabase.from('posts').select('*').limit(30).then(async ({ data: allPosts }) => {
      const ids = (allPosts ?? []).map(p => p.id)
      if (ids.length === 0) return
      const { data: likes } = await supabase.from('likes').select('post_id').in('post_id', ids)
      const counts: Record<string, number> = {}
      for (const l of (likes ?? []) as { post_id: string }[]) {
        counts[l.post_id] = (counts[l.post_id] ?? 0) + 1
      }
      // いいね数降順ソート → 上位8件
      const sorted = (allPosts ?? []).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
      setTrendingPosts(sorted.slice(0, 8))
      setTrendingLikeCounts(counts)
    })
  }, [])
  // スクロールアニメーション
  // 学習ポイント: IntersectionObserver
  // 要素がビューポートに入ったタイミングを検知して .visible を付与する
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          // post-card はグリッド内で stagger delay を付与
          if (el.classList.contains('post-card')) {
            const siblings = [...(el.parentElement?.children ?? [])]
            const idx = siblings.indexOf(el)
            el.style.transitionDelay = `${idx * 0.09}s`
          }
          el.classList.add('visible')
          // 一度 visible になったら監視解除
          observer.unobserve(el)
        })
      },
      { threshold: 0.1 }
    )

    // 監視対象を登録
    document.querySelectorAll('.fade-up, .post-card').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen text-text">
      {/* 固定ナビ */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-[18px] bg-bg/75 backdrop-blur-xl border-b border-border">
        {/* ロゴ: アイコン廃止・フォントウェイトだけで存在感を出す (Apple .com の "apple" ロゴと同じ哲学) */}
        <Link
          href="/"
          style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}
        >
          SEN
        </Link>
        <div className="hidden md:flex items-center gap-7">
          <Link href="/"           className="text-[13px] font-medium text-sub hover:text-text transition">ホーム</Link>
          <Link href="/swipe"      className="text-[13px] font-medium text-sub hover:text-text transition">発見する</Link>
          {currentUser && (
            <Link href="/collection" className="text-[13px] font-medium text-sub hover:text-text transition">コレクション</Link>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/swipe" className="hidden sm:block px-[18px] py-2 rounded-lg text-[13px] font-semibold border border-border2 text-sub hover:text-text hover:border-sub transition">
            スワイプ
          </Link>
          {currentUser ? (
            /* ログイン済み: プロフィールアイコン */
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border2 hover:border-sub transition"
            >
              <div className="w-6 h-6 rounded-lg bg-surface overflow-hidden flex items-center justify-center flex-shrink-0">
                {myAvatar && myAvatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={myAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-sub">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <span className="text-[13px] font-semibold text-sub hidden sm:block">
                {myUsername || 'プロフィール'}
              </span>
            </Link>
          ) : (
            /* 未ログイン: ログインボタン */
            <Link
              href="/login"
              className="px-[18px] py-2 rounded-lg text-[13px] font-semibold border border-border2 text-sub hover:text-text hover:border-sub transition"
            >
              ログイン
            </Link>
          )}
          <Link href="/post" className="px-[18px] py-2 rounded-lg text-[13px] font-bold bg-surface2 border border-border2 text-text hover:border-sub transition">
            投稿する →
          </Link>
        </div>
      </nav>

      {/* コンテンツ */}
      <Hero bgPosts={heroPosts} />
      <DeckTabsBar />
      <DiscoverSection posts={heroPosts} stats={stats} />
      <StatsBar stats={stats} />
      {/* 人気投稿 (いいね数順) */}
      <HorizontalPostRow
        eyebrow="TRENDING NOW"
        title="人気投稿"
        posts={trendingPosts}
        likeCountMap={trendingLikeCounts}
        currentUserId={currentUser?.id}
      />
      {/* 新着作品 */}
      <HorizontalPostRow
        eyebrow="NEW ARRIVALS"
        title="新着作品"
        posts={newPosts}
        likeCountMap={{}}
        currentUserId={currentUser?.id}
      />
      <FeedSection currentUserId={currentUser?.id} />
      <DeckSection />
      <FinalCTA />

      {/* フッター */}
      <footer className="border-t border-border px-6 md:px-12 py-9 flex items-center justify-between">
        <span className="text-sm font-black text-sub">Sen</span>
        <span className="text-[11px] text-sub2">© 2026</span>
      </footer>
    </div>
  )
}
