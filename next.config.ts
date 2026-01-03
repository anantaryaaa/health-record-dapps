import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pino", 
    "thread-stream",
    "utf-8-validate",
    "bufferutil",
    "pino-pretty",
    "lokijs"
  ],
  // Enable Turbopack
  turbopack: {
    // Ad any specific Turbopack resolve aliases if needed, otherwise empty object to suppress warning
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      "bufferutil": "commonjs bufferutil",
      "pino-pretty": "commonjs pino-pretty",
      "lokijs": "commonjs lokijs",
    });
    return config;
  },
};

export default nextConfig;
