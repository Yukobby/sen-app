'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FeedbackButton() {
  const [open,    setOpen]    = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      message: message.trim(),
      page:    typeof window !== 'undefined' ? window.location.pathname : null,
    })

    setSending(false)
    setSent(true)
    setMessage('')
    setTimeout(() => {
      setSent(false)
      setOpen(false)
    }, 2000)
  }

  return (
    <>
      {/* 浮かぶボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border border-border2 bg-surface text-sub hover:text-text hover:border-sub transition shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        フィードバック
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          {/* オーバーレイ */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-border2 bg-surface p-6 shadow-[0_24px_64px_rgba(0,0,0,0.7)]">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[16px] font-extrabold tracking-tight">改善リクエスト</h2>
                <p className="text-[12px] text-sub mt-0.5">気になったこと・欲しい機能を気軽に！</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-sub hover:text-text transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-bold text-save">送信しました！ありがとう</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* 例のチップ */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {['このカードが重複してる', 'このジャンルも欲しい', 'UIがわかりにくい', '◯◯機能が欲しい'].map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setMessage(ex)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-border2 text-sub hover:text-text hover:border-sub transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="なんでも書いてください。バグ報告・要望・感想など。"
                  rows={4}
                  maxLength={500}
                  autoFocus
                  className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-sub2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none mb-3"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-sub2">{message.length} / 500</span>
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="px-5 py-2 rounded-xl bg-text text-bg text-sm font-bold hover:-translate-y-0.5 transition disabled:opacity-40 disabled:transform-none"
                  >
                    {sending ? '送信中...' : '送信する'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
