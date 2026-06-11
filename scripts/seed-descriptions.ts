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

// ── MangaDex: あらすじ (日本語優先) ──────────────────
// 表紙はMangaDexの品質が不安定なのでJikanを使う
async function findMangaDescription(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '5',
      'order[relevance]': 'desc',
    })
    const res = await fetch(`https://api.mangadex.org/manga?${params}`, {
      headers: { 'User-Agent': 'sen-manga-app/1.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    for (const manga of (data.data ?? []) as any[]) {
      const desc = manga.attributes?.description
      const text = desc?.ja ?? desc?.en ?? desc?.['ja-ro'] ?? null
      if (text && text.length > 30) return text
    }
  } catch {}
  return null
}

// ── Jikan (MyAnimeList): 漫画 表紙URL ─────────────────
// MALの画像は高品質で安定している
async function findMangaImageUrl(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: title, limit: '3' })
    const res  = await fetch(`https://api.jikan.moe/v4/manga?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    for (const item of (data.data ?? []) as any[]) {
      const url = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null
      if (url && !url.includes('questionmark')) return url
    }
  } catch {}
  return null
}

// ── manga: あらすじ(MangaDex) + 表紙(Jikan) ──────────
async function findMangaInfo(title: string): Promise<{ description: string | null; imageUrl: string | null }> {
  const [description, imageUrl] = await Promise.all([
    findMangaDescription(title),
    findMangaImageUrl(title),
  ])
  return { description, imageUrl }
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
