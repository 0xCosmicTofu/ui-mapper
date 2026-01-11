import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",
  
  // Optimize for production
  compress: true,
};

export default nextConfig;
