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
};

export default nextConfig;
