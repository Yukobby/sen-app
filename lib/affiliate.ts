// アフィリエイトリンク生成ロジック
// 将来: Amazon PA-API や公式APIに差し替え
// 今は「タイトル文字列で検索URLを作る」シンプルな実装

export type AffLink = {
  label: string
  url: string
  primary?: boolean
}

export function getAffLinks(title: string, category: string): AffLink[] {
  const q = encodeURIComponent(title)

  switch (category) {
    case 'anime':
      return [
        { label: '配信で観る', url: `https://animestore.docomo.ne.jp/animestore/sch_pc?searchKey=${q}`, primary: true },
        { label: 'Amazonで探す', url: `https://www.amazon.co.jp/s?k=${q}` },
      ]
    case 'manga':
      return [
        { label: '電子書籍で読む', url: `https://www.amazon.co.jp/s?k=${q}&i=digital-text`, primary: true },
        { label: '紙で買う', url: `https://www.amazon.co.jp/s?k=${q}` },
      ]
    case 'gadget':
      return [
        { label: 'Amazonで見る', url: `https://www.amazon.co.jp/s?k=${q}`, primary: true },
      ]
    default:
      // 将来のジャンル追加はここに追記するだけ
      return [
        { label: 'Amazonで探す', url: `https://www.amazon.co.jp/s?k=${q}`, primary: true },
      ]
  }
}
