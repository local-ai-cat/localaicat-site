import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'"
    ].join("; ")
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  }
];

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    BUILD_COMMIT: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7)
      ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
      ?? "dev",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
