'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { searchCovers, type CoverResult } from '@/lib/coverSearch'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Supabase Storage に画像をアップロードして公開URLを返す
async function uploadImage(file: File, userId: string): Promise<string | null> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('post-images')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) { console.error('upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
  return publicUrl
}

// 外部URL (Google Books / Jikan) の画像をBlobとしてSupabase Storageにアップロード
// → URL が変わっても永続的に表示できる
async function uploadFromUrl(imageUrl: string, userId: string): Promise<string | null> {
  try {
    const res  = await fetch(imageUrl)
    const blob = await res.blob()
    const ext  = blob.type.includes('png') ? 'png' : 'jpg'
    const file = new File([blob], `cover.${ext}`, { type: blob.type })
    return await uploadImage(file, userId)
  } catch {
    // アップロード失敗時は外部URLをそのまま使う
    return imageUrl
  }
}

export default function PostPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title,    setTitle]    = useState('')
  const [comment,  setComment]  = useState('')
  const [category, setCategory] = useState<'manga' | 'anime'>('manga')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [user,     setUser]     = useState<any>(null)

  // 画像関連
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [selectedUrl,   setSelectedUrl]   = useState<string | null>(null) // 検索から選んだURL
  const [uploading,     setUploading]     = useState(false)
  const [dragOver,      setDragOver]      = useState(false)

  // 表紙検索
  const [searching,     setSearching]     = useState(false)
  const [coverResults,  setCoverResults]  = useState<CoverResult[]>([])
  const [showPicker,    setShowPicker]    = useState(false)
  const [autoDesc,      setAutoDesc]      = useState<string>('')  // 自動取得したあらすじ
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // タイトルが変わったら自動検索 (debounce 700ms)
  // 学習ポイント: debounce — 入力のたびに検索しない。最後の入力から700ms後に1回だけ実行
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!title.trim() || title.length < 2) {
      setCoverResults([])
      setShowPicker(false)
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const results = await searchCovers(title, category)
      setCoverResults(results)
      setShowPicker(results.length > 0 && !imagePreview && !selectedUrl)
      // 最初のヒットのあらすじを自動セット (まだ空のとき)
      if (results[0]?.description && !autoDesc) {
        setAutoDesc(results[0].description)
      }
      setSearching(false)
    }, 700)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [title, category, imagePreview, selectedUrl])

  // 表紙を選択 (あらすじも一緒にセット)
  const selectCover = useCallback((cover: CoverResult) => {
    setSelectedUrl(cover.url)
    setImagePreview(cover.url)
    setImageFile(null)
    setShowPicker(false)
    if (cover.description) setAutoDesc(cover.description)
  }, [])

  // 手動アップロード
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return }
    if (file.size > 5 * 1024 * 1024)    { setError('5MB以下の画像を選択してください'); return }
    setImageFile(file)
    setSelectedUrl(null)
    setImagePreview(URL.createObjectURL(file))
    setShowPicker(false)
    setError('')
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) handleFile(file)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]; if (file) handleFile(file)
  }
  function removeImage() {
    setImageFile(null); setSelectedUrl(null)
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setShowPicker(coverResults.length > 0)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('作品名を入力してください'); return }
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('投稿にはGoogleログインが必要です'); setLoading(false); return }

    let imageUrl: string | undefined

    if (imageFile) {
      // 手動アップロード
      setUploading(true)
      const url = await uploadImage(imageFile, user.id)
      setUploading(false)
      if (!url) { setError('画像のアップロードに失敗しました'); setLoading(false); return }
      imageUrl = url
    } else if (selectedUrl) {
      // 検索で選んだ外部URL → Supabase に転送して保存
      setUploading(true)
      imageUrl = await uploadFromUrl(selectedUrl, user.id) ?? selectedUrl
      setUploading(false)
    }

    const { error: err } = await supabase.from('posts').insert({
      title:       title.trim(),
      comment:     comment.trim(),
      category,
      user_id:     user.id,
      image_url:   imageUrl,
      description: autoDesc.trim() || undefined,
    })

    if (err) { setError('投稿に失敗しました: ' + err.message); setLoading(false) }
    else     { router.push('/') }
  }

  const CATEGORIES: { key: 'manga' | 'anime'; label: string }[] = [
    { key: 'manga', label: '漫画' },
    { key: 'anime', label: 'アニメ' },
  ]

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4 bg-bg/75 backdrop-blur-xl sticky top-0 z-10">
        <Link href="/" className="text-sub hover:text-text transition text-sm font-medium flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          戻る
        </Link>
        <h1 className="text-[16px] font-extrabold tracking-tight">おすすめを投稿</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* カテゴリ */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-3 tracking-widest uppercase">
              カテゴリ
            </label>
            <div className="flex gap-3">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition ${
                    category === key
                      ? 'bg-text text-bg'
                      : 'bg-surface2 border border-border2 text-sub hover:text-text hover:border-sub'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 作品名 + 検索インジケーター */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-3 tracking-widest uppercase">
              作品名 <span className="text-skip">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ヴィンランド・サガ、葬送のフリーレン..."
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-sub2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
              />
              {/* 検索中スピナー */}
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 animate-spin text-sub2" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                            strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
            </div>
            {/* 検索ヒント */}
            {title.length >= 2 && !searching && coverResults.length > 0 && !imagePreview && (
              <p className="text-[11px] text-sub2 mt-1.5 flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-save">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {coverResults.length}件の表紙が見つかりました ↓
              </p>
            )}
          </div>

          {/* 表紙ピッカー (タイトル入力後に自動表示) */}
          {showPicker && coverResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-sub2 tracking-widest uppercase">
                  表紙を選択 — タップで決定
                </label>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="text-[11px] text-sub2 hover:text-sub transition"
                >
                  閉じる
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {coverResults.slice(0, 8).map((cover, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectCover(cover)}
                    className="group relative rounded-lg overflow-hidden border border-border hover:border-sub transition aspect-[3/4] bg-surface2"
                    title={cover.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover.url}
                      alt={cover.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* ホバーで選択オーバーレイ */}
                    <div className="absolute inset-0 bg-bg/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-6 h-6 text-text">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-sub2 mt-2">
                または↓から手動でアップロードもできます
              </p>
            </div>
          )}

          {/* 画像エリア */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-3 tracking-widest uppercase">
              表紙画像 <span className="text-sub2 normal-case font-normal">(任意)</span>
            </label>

            {imagePreview ? (
              /* プレビュー表示 */
              <div className="relative rounded-xl overflow-hidden bg-surface2 border border-border" style={{ aspectRatio: '4/3' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="プレビュー" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg/80 backdrop-blur-sm border border-border2 flex items-center justify-center text-sub hover:text-text transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                {selectedUrl && (
                  <div className="absolute bottom-3 left-3 text-[10px] text-white/70 bg-bg/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    自動取得
                  </div>
                )}
                {imageFile && (
                  <div className="absolute bottom-3 left-3 text-[10px] text-white/70 bg-bg/60 backdrop-blur-sm px-2 py-1 rounded-md">
                    {imageFile.name}
                  </div>
                )}
              </div>
            ) : (
              /* ドロップゾーン */
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl cursor-pointer transition
                  flex flex-col items-center justify-center gap-3 py-8
                  ${dragOver ? 'border-accent bg-surface2' : 'border-border2 hover:border-sub bg-surface'}
                `}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-sub2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold text-sub">クリックして選択 / ドロップ</p>
                  <p className="text-[11px] text-sub2 mt-1">JPG, PNG, WebP · 5MB以下</p>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </div>

          {/* コメント */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-3 tracking-widest uppercase">
              一言コメント <span className="text-sub2 normal-case font-normal">(任意)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="なぜおすすめ？ 何が好き？"
              rows={3}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-sub2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
            />
          </div>

          {error && <p className="text-skip text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-text text-bg font-extrabold py-4 rounded-xl text-sm tracking-wide hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,255,255,.1)] disabled:opacity-50 disabled:transform-none transition"
          >
            {uploading ? '画像を保存中...' : loading ? '投稿中...' : '投稿する'}
          </button>

          {user ? (
            <p className="text-center text-save text-sm font-medium">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 inline mr-1.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {user.email} でログイン中
            </p>
          ) : (
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })}
              className="w-full bg-surface2 border border-border2 hover:border-sub text-sub hover:text-text py-3 rounded-xl transition text-sm font-medium"
            >
              Googleでログイン（投稿に必要）
            </button>
          )}
        </form>
      </main>
    </div>
  )
}
