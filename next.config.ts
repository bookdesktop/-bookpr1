import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // สำหรับ Docker: สร้าง .next/standalone ที่มีเฉพาะไฟล์ที่ต้องใช้ตอนรัน
  output: "standalone",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
