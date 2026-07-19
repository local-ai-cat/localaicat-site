import type { NextConfig } from "next";

// Turbopack/React dev mode needs eval() for HMR + callstack reconstruction;
// production never does (and must not allow it). Gate 'unsafe-eval' on env.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "https://app.chatwoot.com",
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://app.chatwoot.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://app.chatwoot.com",
      "connect-src 'self' https: wss://app.chatwoot.com",
      "frame-src 'self' https://app.chatwoot.com",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
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
  env: {
    BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Type",
            value: "application/json"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600"
          }
        ]
      },
      {
        source: "/apple-app-site-association",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Type",
            value: "application/json"
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600"
          }
        ]
      },
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
