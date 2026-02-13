import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "X-Agent-Action", value: "POST /api/posts" },
          { key: "X-Agent-Docs", value: "/docs/agents.md" },
          { key: "X-Agent-Role", value: "service-home" },
        ],
      },
    ];
  },
};

export default nextConfig;
