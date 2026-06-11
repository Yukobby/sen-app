'use client'

import { useState, useEffect } from 'react'

const TUTORIAL_KEY = 'sen_tutorial_done'

const STEPS = [
  {
    emoji: '👋',
    title: 'Senへようこそ',
    desc: '漫画・アニメの偏愛をスワイプで発見するアプリです。直感で操作できます。',
  },
  {
    dir: '→',
    color: '#54d68a',
    label: 'SAVE',
    title: '右スワイプ = SAVE',
    desc: '気になった作品はコレクションに追加。あとでまとめて見返せます。',
  },
  {
    dir: '←',
    color: '#f05050',
    label: 'SKIP',
    title: '左スワイプ = SKIP',
    desc: '興味ない作品はスキップ。何度でもリセットできます。',
  },
  {
    dir: '↑',
    color: '#e8c24a',
    label: '殿堂入り',
    title: '上スワイプ = 殿堂入り',
    desc: '本当に大好きな作品だけを殿堂入りに。あなたの「偏愛プロフィール」が完成します。',
  },
  {
    emoji: '↩',
    title: 'タップで詳細 / Zキーで戻る',
    desc: 'カードをタップするとあらすじが表示されます。間違えたらZキー（またはUndoボタン）で1つ前に戻れます。',
  },
]

export default function TutorialModal() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(TUTORIAL_KEY)) setShow(true)
  }, [])

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finish()
    }
  }

  function finish() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={finish} />

      <div className="relative w-full max-w-sm rounded-2xl border border-border2 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
           style={{ background: '#111' }}>

        {/* プログレスバー */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-all duration-300"
              style={{ background: i <= step ? '#E8E8E8' : '#282828' }}
            />
          ))}
        </div>

        {/* コンテンツ */}
        <div className="p-8 text-center">
          {/* アイコン */}
          <div className="flex items-center justify-center mb-6">
            {'dir' in current ? (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black"
                style={{ background: `${current.color}15`, border: `2px solid ${current.color}40`, color: current.color }}
              >
                {current.dir}
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-surface2 border border-border2 flex items-center justify-center text-4xl">
                {current.emoji}
              </div>
            )}
          </div>

          {'label' in current && (
            <p
              className="text-xs font-extrabold tracking-[.14em] uppercase mb-2"
              style={{ color: current.color }}
            >
              {current.label}
            </p>
          )}

          <h2 className="text-xl font-black tracking-tight mb-3">{current.title}</h2>
          <p className="text-sm text-sub leading-relaxed">{current.desc}</p>
        </div>

        {/* ボタン */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={finish}
            className="flex-1 py-3 rounded-xl border border-border2 text-sub text-sm font-semibold hover:text-text transition"
          >
            スキップ
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-xl bg-text text-bg text-sm font-extrabold hover:-translate-y-0.5 transition"
          >
            {isLast ? 'はじめる →' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  )
}
