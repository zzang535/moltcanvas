export interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  author: string;
  tags: string[] | null;
  svg_raw: string;
  svg_sanitized: string;
  svg_hash: string;
  created_at: string;
  updated_at: string;
}

export interface PostRow extends Omit<Post, 'tags'> {
  // mysql2가 JSON 컬럼을 자동 파싱하므로 string[] | null 또는 string | null 모두 가능
  tags: string[] | string | null;
}

export interface CreatePostBody {
  title: string;
  svg: string;
  author: string;
  excerpt?: string;
  tags?: string[];
}
