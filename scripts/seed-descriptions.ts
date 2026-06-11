/**
 * 既存投稿にあらすじ＋表紙画像を自動補完するスクリプト
 * 通常実行:     npx tsx scripts/seed-descriptions.ts
 * 強制上書き:   npx tsx scripts/seed-descriptions.ts --force
 * 画像のみ:     npx tsx scripts/seed-descriptions.ts --images-only
 *
 * - manga → MangaDex API (あらすじ: ja 優先, 表紙: uploads.mangadex.org)
 * - anime → Jikan API   (あらすじ: synopsis, 表紙: images.jpg.large_image_url)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FORCE       = process.argv.includes('--force')
const IMAGES_ONLY = process.argv.includes('--images-only')

function isLikelyEnglish(text: string): boolean {
  const ascii = [...text].filter(c => c.charCodeAt(0) < 128).length
  return ascii / text.length > 0.85
}

// ── MangaDex: あらすじ + 表紙URL ──────────────────────
// cover_art リレーションを includes[] で同時取得
// 表紙URL: https://uploads.mangadex.org/covers/{mangaId}/{fileName}.512.jpg
async function findMangaInfo(title: string): Promise<{ description: string | null; imageUrl: string | null }> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '5',
      'order[relevance]': 'desc',
      'includes[]': 'cover_art',
    })
    const res = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { 'User-Agent': 'sen-manga-app/1.0' },
    })
    if (!res.ok) throw new Error(`MangaDex ${res.status}`)
    const data = await res.json()

    for (const manga of (data.data ?? []) as any[]) {
      // あらすじ: ja → en フォールバック
      const desc = manga.attributes?.description
      const text = desc?.ja ?? desc?.en ?? desc?.['ja-ro'] ?? null

      // 表紙: cover_art リレーション
      const coverRel = (manga.relationships ?? []).find((r: any) => r.type === 'cover_art')
      const fileName = coverRel?.attributes?.fileName ?? null
      const imageUrl = fileName
        ? `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg`
        : null

      if (text && text.length > 30) return { description: text, imageUrl }
    }
  } catch (e) {
    console.error('  MangaDex error:', e)
  }
  return { description: null, imageUrl: null }
}

// ── Jikan: あらすじ + 表紙URL ─────────────────────────
// images.jpg.large_image_url が最高解像度
async function findAnimeInfo(title: string): Promise<{ description: string | null; imageUrl: string | null }> {
  try {
    const params = new URLSearchParams({ q: title, limit: '5' })
    const res  = await fetch(`https://api.jikan.moe/v4/anime?${params}`)
    const data = await res.json()
    for (const item of (data.data ?? []) as any[]) {
      const desc     = item.synopsis
      const imageUrl = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null
      if (desc && desc.length > 30) return { description: desc, imageUrl }
    }
  } catch (e) {
    console.error('  Jikan error:', e)
  }
  return { description: null, imageUrl: null }
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  const { data: allPosts, error } = await supabase
    .from('posts')
    .select('id, title, category, description, image_url')
    .order('created_at', { ascending: true })

  if (error) { console.error('fetch error:', error.message); process.exit(1) }

  const posts = (allPosts ?? []).filter(p => {
    if (IMAGES_ONLY) {
      // 画像がないものだけ対象
      return !p.image_url
    }
    if (FORCE) {
      return !p.description || isLikelyEnglish(p.description) || !p.image_url
    }
    return !p.description || !p.image_url
  })

  const mode = IMAGES_ONLY ? '--images-only' : FORCE ? '--force' : '通常'
  console.log(`🔍 対象投稿: ${posts.length} 件 (${mode})\n`)

  let updated = 0, failed = 0

  for (const post of posts) {
    await wait(600) // API レート制限対策

    const info = post.category === 'anime'
      ? await findAnimeInfo(post.title)
      : await findMangaInfo(post.title)

    // 更新するフィールドを決定
    const updateData: Record<string, string> = {}

    if (!IMAGES_ONLY && info.description) {
      updateData.description = info.description
    }
    if (info.imageUrl && (!post.image_url || FORCE)) {
      updateData.image_url = info.imageUrl
    }

    if (Object.keys(updateData).length === 0) {
      console.log(`  – [${post.category}] ${post.title} → 見つからず`)
      failed++
      continue
    }

    const { error: updateErr } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', post.id)

    if (updateErr) {
      console.error(`  ❌ ${post.title}: ${updateErr.message}`)
      failed++
    } else {
      const hasDesc  = updateData.description ? (isLikelyEnglish(updateData.description) ? '(en)' : '(ja)') : ''
      const hasImg   = updateData.image_url ? '🖼' : ''
      console.log(`  ✓ [${post.category}] ${post.title} ${hasDesc} ${hasImg}`)
      updated++
    }
  }

  console.log(`\n✅ 完了: ${updated} 件更新, ${failed} 件スキップ`)
}

run()
