import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Document readers run on the server only, unbundled.
  serverExternalPackages: ["mammoth", "unpdf"],
  // The evidence snapshots ship with the server so the demo works offline.
  outputFileTracingIncludes: { "/**": ["./data/*.json"] },
};

export default nextConfig;
