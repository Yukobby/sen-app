// ──────────────────────────────────────────────
// OAuth コールバックルートハンドラー
//
// 学習ポイント: Next.js App Router の Route Handler
// - `route.ts` はページではなく API エンドポイント (UIなし)
// - `cookies()` は Next.js 16 で async になった
// - @supabase/ssr の createServerClient でサーバーサイドから
//   セッションを確立し、cookie に書き込む
// ──────────────────────────────────────────────
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()        { return cookieStore.getAll() },
          setAll(list)    { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
  }

  // ログイン後は next パラメーターのページへ (デフォルトはホーム)
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
}
