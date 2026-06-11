/**
 * シードデータ投入スクリプト
 * 実行: npx tsx scripts/seed.ts
 *
 * 必要な環境変数 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  ← Supabase > Settings > API > service_role
 *   SEED_USER_ID               ← Supabase > Authentication > Users > 自分のID
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const seedUserId      = process.env.SEED_USER_ID!

if (!supabaseUrl || !serviceRoleKey || !seedUserId) {
  console.error('❌ 環境変数が足りません。.env.local を確認してください。')
  process.exit(1)
}

// service role key で RLS をバイパスして挿入できるクライアント
const supabase = createClient(supabaseUrl, serviceRoleKey)

// ──────────────────────────────────────────────
// シードデータ
// ──────────────────────────────────────────────
const posts = [
  // ── 漫画 ──
  { category: 'manga', title: 'ONE PIECE',           comment: '伏線回収がエグい。100巻超えてるけど今が一番面白いってどういうこと？' },
  { category: 'manga', title: 'NARUTO -ナルト-',      comment: 'ペイン戦は何度読んでも泣く。努力と根性の本当の意味を教えてもらった。' },
  { category: 'manga', title: 'DRAGON BALL',         comment: 'バトル漫画の金字塔。コマ割りの見やすさとアクションの躍動感は今読んでもバケモノ。' },
  { category: 'manga', title: '鬼滅の刃',             comment: 'テンポが良すぎて一気読み不可避。敵の鬼側のバックボーンも深くて感情移入してしまう。' },
  { category: 'manga', title: '呪術廻戦',             comment: '能力バトルとして最高峰。展開が容赦なさすぎて毎週胃を痛めながら読んでる。' },
  { category: 'manga', title: '進撃の巨人',           comment: 'ただのパニック漫画かと思ったら、世界観のどんでん返しが神がかってた。歴史に残る名作。' },
  { category: 'manga', title: '鋼の錬金術師',         comment: '全27巻、最初から最後まで一切の無駄がない完璧な構成。綺麗に完結した漫画の代表格。' },
  { category: 'manga', title: 'DEATH NOTE',          comment: 'Lと月（ライト）の心理戦が熱すぎる。文字多いのにページをめくる手が止まらない。' },
  { category: 'manga', title: 'ハイキュー!!',         comment: 'スポーツ漫画で一番好き。敵味方全員にフォーカスが当たって、捨てキャラが一人もいない。' },
  { category: 'manga', title: '僕のヒーローアカデミア', comment: 'アメコミっぽさと熱血ジャンプ展開の融合。オールマイトの「次は、君だ」で号泣した。' },
  { category: 'manga', title: 'HUNTER×HUNTER',      comment: 'キメラアント編のラストは漫画史に残る芸術。休載多くても絶対に見捨てられない面白さがある。' },
  { category: 'manga', title: 'チェンソーマン',       comment: '映画的な構図と、予測不能すぎる狂った展開が最高。読んだ後しばらく頭から離れなかった。' },
  { category: 'manga', title: '東京喰種トーキョーグール', comment: 'カネキ君の覚醒シーンは何度見ても鳥肌が立つ。中二病心をくすぐられまくる。' },
  { category: 'manga', title: 'ジョジョの奇妙な冒険', comment: 'スタンド能力の概念を生み出した偉大な作品。第7部（SBR）の完成度は異常。' },
  { category: 'manga', title: 'ベルセルク',           comment: '作画の描き込みが人間の限界を超えてる。圧倒的絶望とそれに抗う姿に圧倒される。' },
  { category: 'manga', title: 'ヴィンランド・サガ',   comment: 'ただのバイキング漫画じゃない。農場編の哲学的な深さに触れて人生観が変わった。' },
  { category: 'manga', title: 'キングダム',           comment: '合従軍編の面白さは異常。熱量の高い大軍勢のぶつかり合いで毎回胸が熱くなる。' },
  { category: 'manga', title: 'MONSTER',             comment: '浦沢直樹の最高傑作。人間の奥底にある「悪」を緻密に描いていて背筋が凍る。' },
  { category: 'manga', title: '20世紀少年',           comment: '謎が謎を呼ぶ展開で徹夜で読んでしまった。「ともだち」の正体が分かった時の鳥肌ヤバい。' },
  { category: 'manga', title: 'SLAM DUNK',           comment: '山王戦の後半、セリフが一切ない数ページの静寂と緊張感。漫画表現の一つの到達点。' },
  { category: 'manga', title: 'AKIRA',               comment: '80年代にこの世界観を描き上げた大友克洋は天才。すべてのSFの原点。' },
  { category: 'manga', title: 'SPY×FAMILY',          comment: 'アーニャがとにかく可愛いし、シリアスとギャグのバランスが絶妙で誰にでも勧められる。' },
  { category: 'manga', title: '推しの子',             comment: 'ただの転生モノかと思ったら、現代の芸能界やSNSのリアルな闇をえぐり出してて衝撃を受けた。' },
  { category: 'manga', title: '葬送のフリーレン',     comment: '戦闘がメインじゃなく、流れていく「時間」や「記憶」に焦点を当てた切なくて温かい名作。' },
  { category: 'manga', title: 'ブルーロック',         comment: '全員性格悪くて最高（褒め言葉）。スポーツ版のデスゲームって感じでハラハラする。' },
  { category: 'manga', title: 'ゴールデンカムイ',     comment: 'グルメ、歴史、ギャグ、バトル、全部乗せなのに一切とっ散らかってない奇跡のような漫画。' },
  { category: 'manga', title: 'Dr.STONE',            comment: '科学の力で不可能を可能にしていく過程がワクワクしすぎる。知的好奇心を刺激される名作。' },
  { category: 'manga', title: '宇宙兄弟',             comment: '名言の宝庫。大人が夢を追うことの泥臭さと美しさが詰まっていて、読むと前向きになれる。' },
  { category: 'manga', title: '銀の匙 Silver Spoon', comment: 'ハガレンの作者が描く農業の世界。食べ物への感謝と、自分の道を見つける過程にグッとくる。' },
  { category: 'manga', title: '寄生獣',               comment: '全10巻で完璧にまとまったSFの傑作。「人間とは何か」を突きつけられる深すぎる作品。' },

  // ── アニメ ──
  { category: 'anime', title: '新世紀エヴァンゲリオン',            comment: 'アニメの歴史を変えた作品。心理描写の深さとエグさは、大人になってから観るとさらに刺さる。' },
  { category: 'anime', title: 'カウボーイビバップ',                comment: '音楽、作画、演出、すべてが桁外れにお洒落。菅野よう子のジャズBGMが最高にクール。' },
  { category: 'anime', title: 'Steins;Gate',                     comment: '前半の伏線を後半で怒涛のように回収していく快感が異常。記憶を消してもう一度観たい。' },
  { category: 'anime', title: 'コードギアス 反逆のルルーシュ',     comment: 'ロボットアニメでありながら頭脳戦と政治ドラマが熱い。最終回の結末はアニメ史に残る伝説。' },
  { category: 'anime', title: '天元突破グレンラガン',              comment: '圧倒的な熱量と勢いで細かい理屈を全部ぶっ飛ばす。落ち込んだ時に観ると謎の活力が湧いてくる。' },
  { category: 'anime', title: 'ヴァイオレット・エヴァーガーデン',  comment: '京アニの作画が美しすぎる。毎話必ず泣ける。特に10話はバスタオル必須。' },
  { category: 'anime', title: 'サイバーパンク エッジランナーズ',   comment: '全10話一気見したあとの虚無感と余韻が抜けない。色彩感覚とTRIGGERの作画が最高。' },
  { category: 'anime', title: 'モブサイコ100',                    comment: 'バトル作画の滑らかさが世界最高レベル。主人公の優しさに触れて気付けば大号泣してる。' },
  { category: 'anime', title: 'ワンパンマン',                     comment: 'サイタマが来ればなんとかしてくれるという安心感が異常。ギャグとバトルの完璧な融合。' },
  { category: 'anime', title: '魔法少女まどか☆マギカ',            comment: '可愛い絵柄に騙された。3話からの展開と、緻密に練られた世界観の残酷さに震えた。' },
  { category: 'anime', title: 'Re:ゼロから始める異世界生活',       comment: '主人公が弱くて何度も死んで絶望する泥臭さがリアル。18話の神回はアニメ史に刻まれるべき。' },
  { category: 'anime', title: 'ソードアート・オンライン',          comment: 'ナーヴギアとアインクラッドの世界観のワクワク感は異常。俺らの時代の青春バイブル。' },
  { category: 'anime', title: 'ぼっち・ざ・ろっく！',             comment: 'ライブシーンの作画と演奏のリアリティがエグい。陰キャの解像度が高すぎて共感性羞恥で死にそうになる。' },
  { category: 'anime', title: '銀魂',                             comment: '腹抱えて笑ってたらいきなりガチのシリアス展開になって泣かされる。感情の温度差で風邪引くアニメ。' },
  { category: 'anime', title: 'PSYCHO-PASS サイコパス',           comment: 'SF警察モノとして完璧な完成度。悪役の槙島聖護が魅力的すぎて、正義とは何かを考えさせられる。' },
  { category: 'anime', title: '攻殻機動隊 STAND ALONE COMPLEX',   comment: '2002年の作品とは思えないほどテーマが現代的。予言書レベルの深さ。' },
  { category: 'anime', title: '四月は君の嘘',                     comment: '最終話の手紙のシーンは、分かっていても涙腺が崩壊する。演奏シーンの作画が神がかってる。' },
  { category: 'anime', title: '響け！ユーフォニアム',              comment: '部活の人間関係のドロドロ感や上手い下手という残酷な現実から逃げずに描いていて本当に息が詰まる。' },
  { category: 'anime', title: '蟲師',                             comment: '独特の静寂と自然の描写が美しすぎる。深夜に静かに観たくなる、ヒーリング効果すらある名作。' },
  { category: 'anime', title: 'とらドラ！',                       comment: 'ラブコメの最高峰。登場人物全員の心情変化が丁寧に描かれていて何度観ても泣ける。' },
]

async function seed() {
  console.log(`🌱 ${posts.length}件のシードデータを投入します...`)

  // 既存のシードデータを確認
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    console.log(`⚠️  既に ${count} 件のデータがあります。重複投入しますか？ (Ctrl+C でキャンセル)`)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  const records = posts.map(p => ({
    ...p,
    user_id: seedUserId,
  }))

  // 10件ずつバッチ投入
  const batchSize = 10
  let inserted = 0
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from('posts').insert(batch)
    if (error) {
      console.error(`❌ バッチ ${i / batchSize + 1} 失敗:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`✓ ${inserted}/${records.length} 件投入完了`)
  }

  console.log(`\n✅ シード完了！ ${inserted} 件投入しました。`)
}

seed()
