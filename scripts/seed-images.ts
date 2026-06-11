/**
 * 既存投稿に表紙画像を自動補完するスクリプト
 * 実行: npx tsx scripts/seed-images.ts
 *
 * image_url が null の投稿に対して
 * - manga → MangaDex API (covers/search) でカバー画像を取得
 * - anime → Jikan API (MyAnimeList) でポスター画像を取得
 *
 * 変更点: Google Books → MangaDex へ切り替え
 * MangaDex は認証不要で日本語漫画のカバーがほぼ全て揃っている
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── MangaDex API: 漫画カバー画像 ─────────────────────
// 手順:
//   1. /manga?title=xxx&includes[]=cover_art でマンガ検索
//   2. relationships に cover_art が含まれていればその fileName を使う
//   3. URL = https://uploads.mangadex.org/covers/{mangaId}/{fileName}.512.jpg
async function findMangaCover(title: string): Promise<string | null> {
  try {
    // クエリパラメータ: title で検索, cover_art をインクルード, 関連度順
    const params = new URLSearchParams({
      title,
      limit: '5',
      'includes[]': 'cover_art',
      'order[relevance]': 'desc',
    })
    const res  = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { 'User-Agent': 'sen-manga-app/1.0' },
    })
    if (!res.ok) throw new Error(`MangaDex ${res.status}`)
    const data = await res.json()

    for (const manga of (data.data ?? []) as any[]) {
      const rels     = (manga.relationships ?? []) as any[]
      const coverRel = rels.find((r: any) => r.type === 'cover_art')
      const fileName = coverRel?.attributes?.fileName
      if (fileName) {
        return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg`
      }
    }
  } catch (e) {
    // MangaDex失敗時は Google Books にフォールバック
  }

  // ── Fallback: Google Books API ─────────────────────
  try {
    const params = new URLSearchParams({
      q: title,
      maxResults: '5',
      printType: 'books',
    })
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
    const data = await res.json()
    for (const item of (data.items ?? []) as any[]) {
      const links = item.volumeInfo?.imageLinks
      const url   = links?.thumbnail ?? links?.smallThumbnail
      if (url) return url.replace('http://', 'https://').replace('zoom=1', 'zoom=2').replace('&edge=curl', '')
    }
  } catch (e) {}

  return null
}

// ── Jikan API: アニメポスター ─────────────────────────
async function findAnimeCover(title: string): Promise<string | null> {
  const params = new URLSearchParams({ q: title, limit: '5' })
  const res  = await fetch(`https://api.jikan.moe/v4/anime?${params}`)
  const data = await res.json()
  for (const item of (data.data ?? []) as any[]) {
    const url = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url
    if (url) return url
  }
  return null
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── メイン ────────────────────────────────────────────
async function run() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, category')
    .is('image_url', null)
    .order('created_at', { ascending: true })

  if (error) { console.error('fetch error:', error.message); process.exit(1) }
  console.log(`🔍 image_url がない投稿: ${posts?.length ?? 0} 件\n`)

  let updated = 0, failed = 0

  for (const post of posts ?? []) {
    await wait(500)   // MangaDex & Jikan rate limit 対策

    const url = post.category === 'anime'
      ? await findAnimeCover(post.title)
      : await findMangaCover(post.title)

    if (url) {
      const { error: updateErr } = await supabase
        .from('posts')
        .update({ image_url: url })
        .eq('id', post.id)

      if (updateErr) {
        console.error(`  ❌ ${post.title}: ${updateErr.message}`)
        failed++
      } else {
        console.log(`  ✓ [${post.category}] ${post.title}`)
        updated++
      }
    } else {
      console.log(`  – [${post.category}] ${post.title} → 見つからず`)
      failed++
    }
  }

  console.log(`\n✅ 完了: ${updated} 件更新, ${failed} 件スキップ`)
}

run()
