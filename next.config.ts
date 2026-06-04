import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero logo is rendered with quality={100}; Next.js 16 requires the
    // value to be declared here before it'll accept it.
    qualities: [75, 100],
  },
};

export default nextConfig;
