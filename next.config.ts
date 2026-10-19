import type { NextConfig } from "next";

// Turbopack/React dev mode needs eval() for HMR + callstack reconstruction;
// production never does (and must not allow it). Gate 'unsafe-eval' on env,
// FAIL-CLOSED: only an explicit "development" relaxes the CSP. Any other value
// (unset, "test", a typo, a misconfigured deploy) keeps the strict prod policy
// rather than silently allowing eval. `next dev` sets NODE_ENV=development.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  // Vercel Speed Insights loads its collector from va.vercel-scripts.com;
  // without this entry the CSP silently blocks all analytics.
  "https://va.vercel-scripts.com",
]
  .filter(Boolean)
  .join(" ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-src 'self'",
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
  devIndicators: false,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: process.cwd(),
  env: {
    BUILD_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
  async redirects() {
    // Downloads live on the landing page now; the old pages are gone.
    return [
      { source: "/download", destination: "/#download", permanent: true },
      { source: "/download/direct", destination: "/#download", permanent: true }
    ];
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
      },
      {
        source: "/space-demo/:path*",
        headers: securityHeaders.map((header) => {
          if (header.key === "Content-Security-Policy") {
            return { ...header, value: header.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") };
          }
          if (header.key === "X-Frame-Options") return { ...header, value: "SAMEORIGIN" };
          return header;
        })
      }
    ];
  }
};

export default nextConfig;
