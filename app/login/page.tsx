'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginContent() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const next        = searchParams.get('next') ?? '/'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // すでにログイン済みならリダイレクト
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(next)
    })
  }, [router, next])

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) { setError(error.message); setLoading(false) }
    // エラーなければ Google にリダイレクトされるのでローディングのまま
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center px-6">
      {/* ロゴ */}
      <Link href="/" className="mb-12 flex items-center gap-2 font-black text-[22px] tracking-tight hover:opacity-70 transition">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/>
        </svg>
        Sen
      </Link>

      {/* カード */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 space-y-8">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight">ログイン</h1>
          <p className="text-sub text-sm">コレクションを保存するにはログインが必要です</p>
        </div>

        {/* Google ボタン */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-text text-bg font-bold py-3.5 rounded-xl text-sm hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(255,255,255,.1)] disabled:opacity-50 disabled:translate-y-0 transition"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
            </svg>
          ) : (
            /* Google ロゴ (SVG) */
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'リダイレクト中...' : 'Google でログイン'}
        </button>

        {error && (
          <p className="text-center text-[12px] text-skip bg-skip/10 border border-skip/20 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        {/* 注記 */}
        <p className="text-center text-[11px] text-sub2 leading-relaxed">
          ログインすることで、スワイプでSAVEした作品が<br />
          コレクションとして永続保存されます。
        </p>
      </div>

      {/* ホームへ戻る */}
      <Link href="/" className="mt-8 text-[13px] text-sub hover:text-text transition">
        ← ログインせずに見る
      </Link>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginContent />
    </Suspense>
  )
}
