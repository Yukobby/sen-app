// 学習ポイント: next/font/google
// CDN からではなく Vercel のサーバーから自己ホストするので
// 外部リクエストなし・レイアウトシフトなし・高速
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import FeedbackButton from '@/components/FeedbackButton'

// variable font なので weight 配列で全ウェイトを一括読み込み
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta', // CSS 変数として export → globals.css の @theme inline で使用
  weight: ['400', '500', '600', '700', '800'], // Plus Jakarta Sans の最大は 800
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sen — まだ知らない名作を、スワイプで。',
  description: '読んだ、観た、買った——あらゆる「好き」をシェアする場所。スワイプで直感的に次の一冊、一本を見つける。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // jakartaSans.variable で --font-jakarta CSS変数をhtml要素にセット
    <html lang="ja" className={`${jakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative">
        {/* 背景エフェクト: 全ページ共通で固定表示 */}
        <div className="mesh-bg" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
        <FeedbackButton />
      </body>
    </html>
  )
}
