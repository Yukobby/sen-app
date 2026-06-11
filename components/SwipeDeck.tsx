'use client'
// ────────────────────────────────────────────────
// 学習ポイント: framer-motion でドラッグ & スワイプ
//
// useMotionValue  — アニメーション可能な値 (React の state より高速: re-renderしない)
// useTransform    — MotionValue を別の値に変換 (drag量 → overlayの透明度など)
// useAnimationControls — プログラムからアニメーションを起動する
// drag            — motion.div に付けるだけでドラッグ有効化
// ────────────────────────────────────────────────

import {
  forwardRef, useImperativeHandle, useRef,
  useState, useCallback, useEffect,
} from 'react'
import {
  motion, useMotionValue, useTransform,
  useAnimationControls, type PanInfo,
} from 'framer-motion'
import { Post, supabase } from '@/lib/supabase'
import CategoryBadge from './CategoryBadge'
import { getAffLinks } from '@/lib/affiliate'

type Dir = 'left' | 'right' | 'up'

// ── アイコン ──────────────────────────────────────
function BookPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={1.5} className="w-8 h-8">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  )
}
function VideoPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth={1.5} className="w-8 h-8">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
}
const CARD_BG: Record<string, string> = {
  manga:  'linear-gradient(135deg,#1c1a10,#111)',
  anime:  'linear-gradient(135deg,#0d1a1a,#111)',
  gadget: 'linear-gradient(135deg,#1a1a1a,#111)',
}

// ── localStorage: 見済みカードID管理 ─────────────────
// ポイント: SSR中は window が存在しないので typeof window チェックが必要
const SEEN_KEY = 'sen_seen_ids'
function getSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}
function markSeen(id: string) {
  if (typeof window === 'undefined') return
  try {
    const s = getSeenIds(); s.add(id)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]))
  } catch {}
}
function clearSeen() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(SEEN_KEY) } catch {}
}

// ── 1枚のドラッグカード (フリップ対応) ──────────────
// 学習ポイント: CSS 3D transform によるカードフリップ
//
// transformStyle: 'preserve-3d' — 子要素の 3D 変換を維持する
// backfaceVisibility: 'hidden'  — 裏返ったときに反対側の面を非表示にする
// rotateY(180deg)               — Y軸で 180° 回転して裏面を表示
//
// 構造:
//   motion.div (drag: x/y/rotateZ)
//     └── div.flip-inner (rotateY でフリップ, preserve-3d)
//           ├── div.front (表面)
//           └── div.back  (裏面: rotateY(180deg) で最初は非表示)
const SwipeCard = forwardRef<
  { flyOut: (dir: Dir) => void },
  { post: Post; onSwipe: (dir: Dir) => void; isTop: boolean }
>(function SwipeCard({ post, onSwipe, isTop }, ref) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-16, 16])
  const skipOp = useTransform(x, [-10, -90], [0, 1])
  const saveOp = useTransform(x, [10, 90], [0, 1])
  const godOp  = useTransform(y, [-10, -90], [0, 1])
  const controls  = useAnimationControls()
  const fired     = useRef(false)
  const dragMoved = useRef(false)        // ドラッグ中かどうかを追跡
  const [isFlipped, setIsFlipped] = useState(false)

  const flyOut = useCallback(async (dir: Dir) => {
    if (fired.current) return
    fired.current = true
    const target =
      dir === 'up'    ? { y: -700, x: 0, opacity: 0, rotate: 0 } :
      dir === 'right' ? { x: 700, y: 0, opacity: 0, rotate: 20 } :
                        { x: -700, y: 0, opacity: 0, rotate: -20 }
    await controls.start({ ...target, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } })
    onSwipe(dir)
  }, [controls, onSwipe])

  useImperativeHandle(ref, () => ({ flyOut }))

  const handleDragStart = () => { dragMoved.current = false }

  const handleDrag = () => { dragMoved.current = true }

  const handleDragEnd = (_: PointerEvent, info: PanInfo) => {
    const { x: ox, y: oy } = info.offset
    const { x: vx, y: vy } = info.velocity
    // フリップ中はスワイプ判定しない (裏面は読み専用)
    if (isFlipped) { dragMoved.current = false; return }
    // 距離 75px OR 速度 500px/s 以上でスワイプ成立 (Quizletライクな感度)
    const fastUp    = vy < -500 && oy < -40
    const fastRight = vx >  500 && ox >  40
    const fastLeft  = vx < -500 && ox < -40
    if ((oy < -75 && Math.abs(oy) > Math.abs(ox)) || fastUp)  { flyOut('up');    return }
    if (ox > 75  || fastRight) { flyOut('right'); return }
    if (ox < -75 || fastLeft)  { flyOut('left');  return }
    dragMoved.current = false
  }

  // タップ = ドラッグしていないポインターアップ → フリップ
  const handlePointerUp = () => {
    if (!dragMoved.current) setIsFlipped(f => !f)
  }

  const bg = CARD_BG[post.category] ?? CARD_BG.manga

  if (!isTop) {
    return <div className="absolute inset-0 bg-surface border border-border rounded-2xl" />
  }

  return (
    <motion.div
      animate={controls}
      style={{ x, y, rotate, perspective: '1200px', cursor: isFlipped ? 'pointer' : 'grab', touchAction: 'none' } as any}
      drag={!isFlipped}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd as any}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.6)]"
      whileDrag={!isFlipped ? { scale: 1.02 } : {}}
    >
      {/* ── フリップコンテナ ── */}
      <div
        style={{
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ── 表面 ── */}
        <div
          className="absolute inset-0 bg-surface border border-border rounded-2xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="w-full overflow-hidden" style={{ aspectRatio: '4/3', background: bg }}>
            {post.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {post.category === 'anime' ? <VideoPlaceholder /> : <BookPlaceholder />}
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col gap-1">
            <CategoryBadge category={post.category} />
            <h2 className="mt-2 text-xl font-black tracking-tight leading-tight">{post.title}</h2>
            {post.comment && (
              <p className="text-sm text-sub leading-relaxed line-clamp-2">{post.comment}</p>
            )}
          </div>

          {/* タップヒント */}
          <div className="absolute bottom-3 right-4 text-[10px] text-sub2 font-bold tracking-widest uppercase flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3"/>
            </svg>
            タップで解説
          </div>

          {/* フラッシュオーバーレイ */}
          <motion.div
            style={{ opacity: skipOp, background: 'linear-gradient(135deg,rgba(240,80,80,.55) 0%,transparent 55%)' } as any}
            className="absolute inset-0 rounded-2xl pointer-events-none flex items-start p-5"
          >
            <span className="border-2 border-skip text-skip px-3 py-1 rounded-lg text-sm font-black tracking-widest uppercase">Skip</span>
          </motion.div>
          <motion.div
            style={{ opacity: saveOp, background: 'linear-gradient(225deg,rgba(84,214,138,.5) 0%,transparent 55%)' } as any}
            className="absolute inset-0 rounded-2xl pointer-events-none flex items-start justify-end p-5"
          >
            <span className="border-2 border-save text-save px-3 py-1 rounded-lg text-sm font-black tracking-widest uppercase">Save</span>
          </motion.div>
          <motion.div
            style={{ opacity: godOp, background: 'linear-gradient(0deg,rgba(232,194,74,.5) 0%,transparent 60%)' } as any}
            className="absolute inset-0 rounded-2xl pointer-events-none flex items-start justify-center p-5"
          >
            <span className="border-2 border-god text-god px-3 py-1 rounded-lg text-sm font-black tracking-widest uppercase">殿堂入り</span>
          </motion.div>
        </div>

        {/* ── 裏面: 解説・あらすじ ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(160deg, #1a1a2e 0%, #0c0c14 100%)',
            border: '1px solid #282840',
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-start justify-between p-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CategoryBadge category={post.category} />
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-sub2 bg-surface/50 px-2 py-0.5 rounded-full">
                {post.category === 'anime' ? 'MyAnimeList' : 'MangaDex'}
              </span>
            </div>
            <span className="text-[10px] text-sub2 font-bold tracking-widest uppercase flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3"/>
              </svg>
              タップで戻る
            </span>
          </div>

          {/* タイトル */}
          <div className="px-4 pb-2 flex-shrink-0">
            <h2 className="text-lg font-black tracking-tight leading-tight text-text">
              {post.title}
            </h2>
          </div>

          {/* あらすじ本文 (スクロール可能) */}
          <div className="flex-1 px-4 pb-4 overflow-y-auto scrollbar-none relative">
            {post.description ? (
              <>
                <p className="text-[13px] text-sub leading-[1.8] whitespace-pre-line">
                  {post.description}
                </p>
                {/* 下部のフェードアウト */}
                <div className="sticky bottom-0 h-8 pointer-events-none"
                     style={{ background: 'linear-gradient(to top, #0c0c14, transparent)' }} />
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-8">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-sub2">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
                </svg>
                <p className="text-[12px] text-sub2 leading-relaxed">
                  この作品にはまだ<br/>解説データがありません
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// ── メインの SwipeDeck ────────────────────────────
type DeckProps = {
  posts: Post[]
  userId?: string
  deckLabel?: string
}

export default function SwipeDeck({ posts, userId, deckLabel }: DeckProps) {
  const [index,   setIndex]   = useState(0)
  const [saved,   setSaved]   = useState<Post[]>([])
  const [godTier, setGodTier] = useState<Post[]>([])
  const [skipped, setSkipped] = useState(0)
  const [lastPost, setLastPost] = useState<Post | null>(null)
  const [lastDir,  setLastDir]  = useState<Dir | null>(null)
  const cardRef = useRef<{ flyOut: (dir: Dir) => void }>(null)

  // ── 見済みフィルタリング ─────────────────────────────
  // postsから見済みIDを除外したキューを作る
  // useEffect: クライアントのみ (SSRでは localStorage にアクセスできない)
  const [queue, setQueue] = useState<Post[]>(posts)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const seen = getSeenIds()
    setQueue(posts.filter(p => !seen.has(p.id)))
    setInitialized(true)
  }, [posts])

  const handleReset = useCallback(() => {
    clearSeen()
    setQueue(posts)
    setIndex(0)
    setSaved([])
    setGodTier([])
    setSkipped(0)
    setLastPost(null)
  }, [posts])

  const current    = queue[index]
  const isAllSeen  = initialized && queue.length === 0 && posts.length > 0
  const isFinished = initialized && index >= queue.length && queue.length > 0

  // DB保存
  const saveToDb = useCallback(async (post: Post, type: 'save' | 'god') => {
    if (!userId) return
    await supabase.from('collections').upsert(
      { user_id: userId, post_id: post.id, type },
      { onConflict: 'user_id,post_id' }
    )
  }, [userId])

  const removeFromDb = useCallback(async (post: Post) => {
    if (!userId) return
    await supabase.from('collections').delete().eq('user_id', userId).eq('post_id', post.id)
  }, [userId])

  const handleSwipe = useCallback((dir: Dir, post: Post) => {
    setLastPost(post); setLastDir(dir)
    markSeen(post.id)   // localStorage に保存 → 次回ロード時にスキップ
    if (dir === 'right') {
      setSaved(prev => [...prev, post]); saveToDb(post, 'save')
    } else if (dir === 'up') {
      setGodTier(prev => [...prev, post]); saveToDb(post, 'god')
    } else {
      setSkipped(s => s + 1)
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (dir === 'up') navigator.vibrate([40, 20, 80])
      else if (dir === 'right') navigator.vibrate([30])
    }
    setIndex(i => i + 1)
  }, [saveToDb])

  const handleUndo = useCallback(() => {
    if (!lastPost || index === 0) return
    // アンドゥ時は seen から削除
    if (typeof window !== 'undefined') {
      try {
        const seen = getSeenIds(); seen.delete(lastPost.id)
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
      } catch {}
    }
    if (lastDir === 'right') { setSaved(prev => prev.filter(p => p.id !== lastPost.id)); removeFromDb(lastPost) }
    if (lastDir === 'up')    { setGodTier(prev => prev.filter(p => p.id !== lastPost.id)); removeFromDb(lastPost) }
    if (lastDir === 'left')  setSkipped(s => Math.max(0, s - 1))
    setIndex(i => i - 1); setLastPost(null)
  }, [lastPost, lastDir, index, removeFromDb])

  // ── 次の2〜3枚を事前プリロード ────────────────────
  // 学習ポイント: new Image() で src をセットするだけでブラウザがキャッシュに入れる
  // 本番環境では通信遅延があるため、常に先読みしておくことが重要
  useEffect(() => {
    const toPreload = queue.slice(index + 1, index + 4)
    toPreload.forEach(p => {
      if (p.image_url) {
        const img = new Image()
        img.src = p.image_url
      }
    })
  }, [index, queue])

  // ── キーボード操作 ──────────────────────────────
  // 学習ポイント: useEffect のクリーンアップ
  // コンポーネントがアンマウントされたとき listener を解除しないとメモリリークになる
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 入力フォームにフォーカスが当たっているときは無視
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (isFinished || isAllSeen) return

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); cardRef.current?.flyOut('left');  break
        case 'ArrowRight': e.preventDefault(); cardRef.current?.flyOut('right'); break
        case 'ArrowUp':    e.preventDefault(); cardRef.current?.flyOut('up');    break
        case 'z': case 'Z': handleUndo(); break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFinished, handleUndo])

  // ── 全部見済み画面 (localStorage でフィルタされて0件) ──
  if (isAllSeen) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center max-w-xs">
        <div className="w-16 h-16 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-2xl">✅</div>
        <h2 className="text-2xl font-black tracking-tight">全部チェック済み！</h2>
        <p className="text-sub text-sm leading-relaxed">
          表示できる新しい作品がありません。<br />
          リセットしてもう一度見ることができます。
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="bg-text text-bg font-bold px-6 py-3 rounded-full text-sm hover:-translate-y-0.5 transition"
          >
            もう一度全部見る
          </button>
          {userId && (
            <a href="/collection" className="bg-surface2 border border-border2 hover:border-sub text-text font-bold px-6 py-3 rounded-full text-sm transition">
              コレクション →
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── 終了画面 ──────────────────────────────────
  if (isFinished) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center max-w-xs">
        <div className="w-16 h-16 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-2xl">🎉</div>
        <h2 className="text-2xl font-black tracking-tight">全部見ました！</h2>
        <div className="text-sub text-sm space-y-1">
          <p>コレクション: <span className="text-save font-bold">{saved.length}</span> 件</p>
          <p>殿堂入り: <span className="text-god font-bold">{godTier.length}</span> 件</p>
          <p>スキップ: <span className="text-sub font-bold">{skipped}</span> 件</p>
        </div>
        {(saved.length > 0 || godTier.length > 0) && (
          <div className="w-full text-left space-y-2">
            {godTier.map(p => {
              const links = getAffLinks(p.title, p.category)
              return (
                <div key={p.id} className="bg-surface border border-border rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-god text-sm">★</span>
                    <span className="font-semibold text-sm flex-1 truncate">{p.title}</span>
                    <CategoryBadge category={p.category} size="sm" />
                  </div>
                  <div className="flex gap-1.5">
                    {links.map(l => (
                      <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                         className={`flex-1 text-center text-[11px] font-bold py-1.5 rounded-lg transition ${l.primary ? 'bg-god/20 text-god border border-god/30 hover:bg-god/30' : 'bg-surface2 text-sub border border-border2 hover:text-text'}`}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
            {saved.map(p => {
              const links = getAffLinks(p.title, p.category)
              return (
                <div key={p.id} className="bg-surface border border-border rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-save text-sm">♥</span>
                    <span className="font-semibold text-sm flex-1 truncate">{p.title}</span>
                    <CategoryBadge category={p.category} size="sm" />
                  </div>
                  <div className="flex gap-1.5">
                    {links.map(l => (
                      <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                         className={`flex-1 text-center text-[11px] font-bold py-1.5 rounded-lg transition ${l.primary ? 'bg-save/20 text-save border border-save/30 hover:bg-save/30' : 'bg-surface2 text-sub border border-border2 hover:text-text'}`}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!userId && (saved.length > 0 || godTier.length > 0) && (
          <p className="text-[11px] text-sub2 bg-surface border border-border rounded-xl px-3 py-2">
            ログインするとコレクションが保存されます
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleReset}
            className="bg-surface2 border border-border2 hover:border-sub text-text font-bold px-6 py-3 rounded-full transition text-sm"
          >
            もう一度全部見る
          </button>
          {userId && (
            <a href="/collection" className="bg-text text-bg font-bold px-6 py-3 rounded-full text-sm hover:-translate-y-0.5 transition">
              コレクションを見る →
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── メイン: デスクトップ2カラム / モバイル縦並び ──
  return (
    <>
      {/* ── デスクトップ: グリッド2カラム ── */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

        {/* 左カラム: 情報パネル */}
        <div className="hidden md:flex flex-col gap-8">
          {/* ヘッダー */}
          <div>
            <p className="text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2 mb-4">
              {deckLabel ?? '発見する'}
            </p>
            <h2 className="font-black leading-none tracking-tighter mb-4"
                style={{ fontSize: 'clamp(36px, 4vw, 56px)', letterSpacing: '-2px' }}>
              偏愛を、<br />
              <span className="text-sub">スワイプで。</span>
            </h2>
            <p className="text-sub text-[14px] leading-relaxed">
              直感で判断。3方向に振り分けられる。<br />
              ドラッグするとカードの縁が光ってフィードバック。
            </p>
            {/* リセットボタン */}
            <button
              onClick={handleReset}
              className="mt-4 text-[11px] text-sub2 hover:text-sub underline underline-offset-2 transition"
            >
              見済みをリセットして全部見る
            </button>
          </div>

          {/* 操作説明 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-sub">
              <span className="w-2 h-2 rounded-full bg-skip flex-shrink-0" />
              <span><kbd className="font-mono bg-surface2 border border-border2 px-1.5 py-0.5 rounded text-[11px]">←</kbd> 左にスワイプ＝スキップ</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sub">
              <span className="w-2 h-2 rounded-full bg-save flex-shrink-0" />
              <span><kbd className="font-mono bg-surface2 border border-border2 px-1.5 py-0.5 rounded text-[11px]">→</kbd> 右にスワイプ＝コレクションに追加</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sub">
              <span className="w-2 h-2 rounded-full bg-god flex-shrink-0" />
              <span><kbd className="font-mono bg-surface2 border border-border2 px-1.5 py-0.5 rounded text-[11px]">↑</kbd> 上にスワイプ＝殿堂入り（偏愛プロフィールへ）</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-sub">
              <span className="w-2 h-2 rounded-full bg-border2 flex-shrink-0" />
              <span><kbd className="font-mono bg-surface2 border border-border2 px-1.5 py-0.5 rounded text-[11px]">Z</kbd> アンドゥ（1つ前に戻る）</span>
            </div>
          </div>

          {/* カウンター */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-sub2">{index + 1} / {queue.length}</span>
            <span className="text-sub2">·</span>
            <span className="text-save font-bold">保存数 {saved.length}</span>
            <span className="text-sub2">·</span>
            <span className="text-god font-bold">殿堂入り {godTier.length}</span>
            <span className="text-sub2">·</span>
            <span className="text-sub">スキップ {skipped}</span>
          </div>
        </div>

        {/* 右カラム: カード + ボタン */}
        <div className="flex flex-col items-center gap-6">
          {/* モバイル用カウンター */}
          <div className="flex items-center gap-3 md:hidden">
            {deckLabel && (
              <span className="text-xs font-extrabold tracking-widest uppercase text-sub2 bg-surface2 border border-border2 px-2.5 py-1 rounded-full">
                {deckLabel}
              </span>
            )}
            <p className="text-xs text-sub2 font-bold tracking-widest uppercase">
              {index + 1} / {queue.length}
            </p>
          </div>

          {/* カードスタック: モバイルは画面幅いっぱい、デスクトップは大きめ固定 */}
          <div className="relative w-[min(88vw,360px)] md:w-[420px]"
               style={{ height: 'min(calc(88vw * 1.35), 486px)', perspective: '1000px' }}
               // 学習: aspect-ratio を CSS で直接書く代わりに height を width に連動させる
          >
            {[2, 1].map((offset) => {
              const card = queue[index + offset]
              if (!card) return null
              return (
                <div
                  key={card.id}
                  className="absolute inset-0 bg-surface border border-border rounded-2xl"
                  style={{
                    transform: `translateY(${offset * 10}px) scale(${1 - offset * 0.04})`,
                    zIndex: 3 - offset,
                    opacity: 1 - offset * 0.15,
                  }}
                />
              )
            })}
            <div className="absolute inset-0" style={{ zIndex: 4 }}>
              <SwipeCard
                key={current.id}
                ref={cardRef}
                post={current}
                isTop={true}
                onSwipe={(dir) => handleSwipe(dir, current)}
              />
            </div>
          </div>

          {/* ボタン群 */}
          <div className="flex items-center gap-4">
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={!lastPost}
              className="w-10 h-10 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-sub2 hover:text-sub hover:border-sub disabled:opacity-30 transition"
              title="1つ前に戻る (Z)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 101.13-4.41L1 10"/>
              </svg>
            </button>
            {/* SKIP */}
            <button
              onClick={() => cardRef.current?.flyOut('left')}
              className="w-14 h-14 rounded-full bg-surface2 border border-border2 text-skip hover:scale-105 hover:border-skip/50 flex items-center justify-center transition"
              title="スキップ (←)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            {/* 殿堂入り */}
            <button
              onClick={() => cardRef.current?.flyOut('up')}
              className="w-12 h-12 rounded-full bg-surface2 border border-border2 text-god hover:scale-105 hover:border-god/50 flex items-center justify-center transition"
              title="殿堂入り (↑)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/>
              </svg>
            </button>
            {/* SAVE */}
            <button
              onClick={() => cardRef.current?.flyOut('right')}
              className="w-14 h-14 rounded-full bg-save border border-save text-bg hover:scale-105 flex items-center justify-center transition"
              title="コレクションに追加 (→)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
          </div>

          {/* モバイル凡例 */}
          <p className="text-[10px] text-sub2 font-bold tracking-widest uppercase md:hidden">
            ↩ undo · ✕ skip · ★ 殿堂 · ♥ save
          </p>
        </div>
      </div>

    </>
  )
}
