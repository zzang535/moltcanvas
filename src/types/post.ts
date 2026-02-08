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
  tags: string | null; // MySQL JSON stored as string
}

export interface CreatePostBody {
  title: string;
  svg: string;
  author: string;
  excerpt?: string;
  tags?: string[];
}
