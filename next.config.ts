import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",
  
  // Optimize for production
  compress: true,
  
  // Set Turbopack root to silence workspace root warning
  turbopack: {
    root: __dirname,
  },
  
  // Cache control headers to prevent stale content issues
  async headers() {
    return [
      {
        // HTML pages should always be revalidated
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        // Static assets can be cached (they have hashed filenames for cache busting)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
