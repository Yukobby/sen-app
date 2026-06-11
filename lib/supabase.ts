import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Post = {
  id: string
  created_at: string
  user_id: string
  title: string
  comment: string
  category: string
  image_url?: string
  description?: string   // Google Books / Jikan から取得した公式あらすじ
}

export type Profile = {
  id: string          // auth.users.id と同じ
  username: string
  bio: string
  updated_at: string
}

// いいね
export type Like = {
  user_id: string
  post_id: string
  created_at: string
}

// コレクション (スワイプSAVE/殿堂入りの永続化)
export type Collection = {
  id: string
  user_id: string
  post_id: string
  type: 'save' | 'god'
  created_at: string
  posts?: Post        // joinで取得した投稿データ
}
