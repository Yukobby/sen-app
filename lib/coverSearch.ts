/**
 * 表紙画像検索ユーティリティ
 *
 * 漫画  → Google Books API (無料・認証不要・日本語対応)
 * アニメ → Jikan API v4 (MyAnimeList の非公式API・無料・認証不要)
 *
 * 学習ポイント: 外部API呼び出し
 * - fetch() はブラウザ/Node.js 共通で使える
 * - URLSearchParams でクエリパラメーターを安全にエンコードする
 * - API ごとにレスポンス形式が違うので、型を見ながらマッピングする
 */

export type CoverResult = {
  url: string
  title: string
  author?: string
  description?: string   // 公式あらすじ
}

// ── 漫画: Google Books API ────────────────────────
export async function searchMangaCovers(query: string): Promise<CoverResult[]> {
  const params = new URLSearchParams({
    q: query,
    langRestrict: 'ja',
    maxResults: '8',
    printType: 'books',
  })
  const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  const data = await res.json()

  return (data.items ?? [])
    .map((item: any) => {
      const info     = item.volumeInfo ?? {}
      let   imageUrl = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
      if (!imageUrl) return null

      // Google Books の画像は http で返ってくることがある → https に変換
      // zoom=1 より zoom=2 の方が高解像度
      imageUrl = imageUrl
        .replace('http://', 'https://')
        .replace('zoom=1', 'zoom=2')
        .replace('&edge=curl', '')

      return {
        url:         imageUrl,
        title:       info.title ?? '',
        author:      (info.authors ?? []).join(', '),
        description: info.description ?? undefined,
      } as CoverResult
    })
    .filter(Boolean) as CoverResult[]
}

// ── アニメ: Jikan API v4 (MyAnimeList) ──────────
export async function searchAnimeCovers(query: string): Promise<CoverResult[]> {
  const params = new URLSearchParams({ q: query, limit: '8' })
  const res  = await fetch(`https://api.jikan.moe/v4/anime?${params}`)
  const data = await res.json()

  return (data.data ?? [])
    .map((item: any) => {
      // large → jpg の順で大きい画像を優先
      const url = item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url
      if (!url) return null
      return {
        url,
        title:       item.title_japanese ?? item.title ?? '',
        author:      item.studios?.[0]?.name,
        description: item.synopsis ?? undefined,
      } as CoverResult
    })
    .filter(Boolean) as CoverResult[]
}

// ── 統合エントリーポイント ────────────────────────
export async function searchCovers(title: string, category: string): Promise<CoverResult[]> {
  if (!title.trim()) return []
  try {
    if (category === 'anime') return await searchAnimeCovers(title)
    return await searchMangaCovers(title)
  } catch (e) {
    console.error('Cover search failed:', e)
    return []
  }
}
