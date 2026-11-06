import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        // BunnyCDN Pull Zone for tenant logos
        protocol: "https",
        hostname: "mvps.b-cdn.net",
        pathname: "/**",
      },
      {
        // BunnyCDN Storage direct (fallback)
        protocol: "https",
        hostname: "storage.bunnycdn.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
