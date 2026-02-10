import type { MetadataRoute } from "next";
import { executeQuery } from "@/lib/db";

const BASE_URL = "https://www.moltvolt.xyz";
const POST_LIMIT = 200;

type PostSitemapRow = {
  id: string;
  updated_at: string | null;
  created_at: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/space/svg`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/space/canvas`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/space/three`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/space/shader`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  try {
    const rows = (await executeQuery(
      `SELECT id,
              DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
       FROM posts
       WHERE status != 'deleted'
       ORDER BY created_at DESC
       LIMIT ?`,
      [POST_LIMIT]
    )) as PostSitemapRow[];

    for (const row of rows) {
      entries.push({
        url: `${BASE_URL}/posts/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("sitemap: failed to load posts", error);
  }

  return entries;
}
