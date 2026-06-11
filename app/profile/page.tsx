'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user,               setUser]             = useState<any>(null)
  const [username,           setUsername]          = useState('')
  const [bio,                setBio]               = useState('')
  const [avatarUrl,          setAvatarUrl]         = useState<string | null>(null)
  const [avatarPreview,      setAvatarPreview]     = useState<string | null>(null)
  const [avatarFile,         setAvatarFile]        = useState<File | null>(null)
  const [registrationNumber, setRegistrationNumber] = useState<number | null>(null)
  const [loading,            setLoading]           = useState(true)
  const [saving,             setSaving]            = useState(false)
  const [uploading,          setUploading]         = useState(false)
  const [saved,              setSaved]             = useState(false)
  const [error,              setError]             = useState('')
  const [loggingOut,         setLoggingOut]        = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar ?? null)
        setRegistrationNumber(data.registration_number ?? null)
      }
      setLoading(false)
    }
    load()
  }, [router])

  // 画像ファイルを選択したときのプレビュー
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 5MB制限
    if (file.size > 5 * 1024 * 1024) {
      setError('画像は5MB以下にしてください')
      return
    }

    setAvatarFile(file)
    setError('')

    // ローカルプレビュー
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let newAvatarUrl = avatarUrl

    // 画像がある場合はまずStorageにアップロード
    if (avatarFile) {
      setUploading(true)
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadErr) {
        setError('画像のアップロードに失敗しました: ' + uploadErr.message)
        setSaving(false)
        setUploading(false)
        return
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)
      // キャッシュバスター付きで確実に最新画像を表示
      newAvatarUrl = urlData.publicUrl + '?t=' + Date.now()
      setAvatarUrl(newAvatarUrl)
      setUploading(false)
    }

    // プロフィールを保存
    const { error: err } = await supabase.from('profiles').upsert({
      id:         user.id,
      username:   username.trim(),
      bio:        bio.trim(),
      avatar:     newAvatarUrl,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (err) {
      setError('保存に失敗しました: ' + err.message)
    } else {
      setAvatarFile(null)
      setAvatarPreview(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  const displayAvatar = avatarPreview ?? avatarUrl

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-sub text-sm">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4 bg-bg/75 backdrop-blur-xl sticky top-0 z-10">
        <Link href="/" className="text-sub hover:text-text transition text-sm font-medium flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          戻る
        </Link>
        <h1 className="text-[16px] font-extrabold tracking-tight">プロフィール</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="ml-auto text-[13px] font-medium text-sub2 hover:text-skip transition disabled:opacity-50"
        >
          {loggingOut ? 'ログアウト中...' : 'ログアウト'}
        </button>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">

        {/* 登録番号バッジ */}
        {registrationNumber && (
          <div className="flex items-center justify-center mb-10">
            <div className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl border border-border2 bg-surface">
              <p className="text-[10px] font-extrabold tracking-[.14em] uppercase text-sub2">登録番号</p>
              <p
                className="font-black leading-none"
                style={{
                  fontSize: 52,
                  letterSpacing: '-0.05em',
                  color: registrationNumber <= 10 ? '#e8c24a' : registrationNumber <= 50 ? '#c8a84b' : '#F0F0F0'
                }}
              >
                #{registrationNumber}
              </p>
              {registrationNumber <= 10 && (
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(232,194,74,0.15)', color: '#e8c24a', border: '1px solid rgba(232,194,74,0.3)' }}>
                  創設メンバー
                </span>
              )}
              {registrationNumber > 10 && registrationNumber <= 50 && (
                <span className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(200,168,75,0.12)', color: '#c8a84b', border: '1px solid rgba(200,168,75,0.25)' }}>
                  アーリーアダプター
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">

          {/* アバター写真アップロード */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-3 tracking-widest uppercase">
              プロフィール写真
            </label>

            {/* アバター表示 + クリックでアップロード */}
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group flex-shrink-0"
              >
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border2 group-hover:border-sub transition"
                  style={{ background: 'var(--color-surface2)' }}
                >
                  {displayAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayAvatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-sub2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  )}
                </div>
                {/* ホバー時のオーバーレイ */}
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-6 h-6">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-bold text-text hover:text-sub transition mb-1 block"
                >
                  {displayAvatar ? '写真を変更' : '写真をアップロード'}
                </button>
                <p className="text-[11px] text-sub2">JPG・PNG・WEBP / 5MB以下</p>
                {avatarPreview && (
                  <p className="text-[11px] text-save mt-1">✓ 選択済み（保存で反映）</p>
                )}
              </div>
            </div>

            {/* hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Googleアカウント */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-2.5 tracking-widest uppercase">
              Googleアカウント
            </label>
            <div className="bg-surface border border-border rounded-xl px-4 py-3 text-sub text-sm">
              {user?.email}
            </div>
          </div>

          {/* ユーザー名 */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-2.5 tracking-widest uppercase">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例: kobby_dev"
              maxLength={30}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-sub2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
            />
            <p className="text-[11px] text-sub2 mt-1.5 text-right">{username.length} / 30</p>
          </div>

          {/* 一言コメント */}
          <div>
            <label className="block text-[11px] font-bold text-sub2 mb-2.5 tracking-widest uppercase">
              一言コメント <span className="text-sub2 normal-case font-normal">(任意)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="好きなジャンルや推し作品など..."
              rows={3}
              maxLength={200}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-sub2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
            />
            <p className="text-[11px] text-sub2 mt-1.5 text-right">{bio.length} / 200</p>
          </div>

          {error && <p className="text-skip text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className={`w-full font-extrabold py-4 rounded-xl text-sm tracking-wide transition ${
              saved
                ? 'bg-save text-bg'
                : 'bg-text text-bg hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,255,255,.1)] disabled:opacity-50 disabled:transform-none'
            }`}
          >
            {uploading ? '画像アップロード中...' : saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
          </button>
        </form>
      </main>
    </div>
  )
}
