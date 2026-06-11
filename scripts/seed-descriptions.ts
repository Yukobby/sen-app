/**
 * 既存投稿にあらすじを自動補完するスクリプト
 * 通常実行:     npx tsx scripts/seed-descriptions.ts
 * 強制上書き:   npx tsx scripts/seed-descriptions.ts --force
 *
 * --force: 既存の description（英語テキストなど）も上書きして日本語に更新する
 *
 * - manga → MangaDex API (ja 優先)
 * - anime → Jikan API の synopsis
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --force フラグで全件上書き
const FORCE = process.argv.includes('--force')

// ASCII率が高い = 英語テキストと判定（0.85以上で英語扱い）
function isLikelyEnglish(text: string): boolean {
  const ascii = [...text].filter(c => c.charCodeAt(0) < 128).length
  return ascii / text.length > 0.85
}

// ── MangaDex: 漫画あらすじ ────────────────────────────
// data[].attributes.description は { ja: '...', en: '...' } のオブジェクト
// 日本語優先、なければ英語を使う
async function findMangaDescription(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '5',
      'order[relevance]': 'desc',
    })
    const res  = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { 'User-Agent': 'sen-manga-app/1.0' },
    })
    if (!res.ok) throw new Error(`MangaDex ${res.status}`)
    const data = await res.json()

    for (const manga of (data.data ?? []) as any[]) {
      const desc = manga.attributes?.description
      // 日本語優先 → 英語フォールバック
      const text = desc?.ja ?? desc?.en ?? desc?.['ja-ro'] ?? null
      if (text && text.length > 30) return text
    }
  } catch (e) {}

  return null
}

// ── Jikan: アニメあらすじ ─────────────────────────────
async function findAnimeDescription(title: string): Promise<string | null> {
  const params = new URLSearchParams({ q: title, limit: '5' })
  const res  = await fetch(`https://api.jikan.moe/v4/anime?${params}`)
  const data = await res.json()
  for (const item of (data.data ?? []) as any[]) {
    const desc = item.synopsis
    if (desc && desc.length > 30) return desc
  }
  return null
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  // --force: 全件取得して英語テキストも対象にする
  // 通常:   description が null のものだけ
  const { data: allPosts, error } = await supabase
    .from('posts')
    .select('id, title, category, description')
    .order('created_at', { ascending: true })

  if (error) { console.error('fetch error:', error.message); process.exit(1) }

  const posts = (allPosts ?? []).filter(p => {
    if (FORCE) {
      // --force: null または英語っぽいものを対象に
      return !p.description || isLikelyEnglish(p.description)
    }
    return !p.description
  })

  console.log(`🔍 対象投稿: ${posts.length} 件 ${FORCE ? '(--force: 英語テキスト含む)' : '(description が null)'}\n`)

  let updated = 0, failed = 0

  for (const post of posts) {
    await wait(500)

    const desc = post.category === 'anime'
      ? await findAnimeDescription(post.title)
      : await findMangaDescription(post.title)

    if (desc) {
      const { error: updateErr } = await supabase
        .from('posts')
        .update({ description: desc })
        .eq('id', post.id)

      if (updateErr) {
        console.error(`  ❌ ${post.title}: ${updateErr.message}`)
        failed++
      } else {
        const lang = isLikelyEnglish(desc) ? '(en)' : '(ja)'
        console.log(`  ✓ [${post.category}] ${post.title} ${lang}`)
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
