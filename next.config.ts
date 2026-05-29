import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilita instrumentation.ts para el cron de sync AAG
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
