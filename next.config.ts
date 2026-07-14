// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // A stray package-lock.json in the user home dir makes Next infer the
  // wrong workspace root (breaks dev config propagation) - pin it here
  outputFileTracingRoot: __dirname,

  // REMOVED: output: 'export' - Need API routes for IMAP email fetching
  // If you need static export for mobile, you can build separately or use ISR

  // Server mode on Vercel: next/image optimization (WebP, resize) works.
  // Remote photos (sesizari/anunturi) live in Firebase Storage.
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },

  // Trailing slash pentru navigare corectă
  trailingSlash: true,


  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'https://primaria.digital',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },
  
  // Lint runs as a dedicated CI step (`npm run lint`, flat config in
  // eslint.config.mjs) where ERRORS block the PR; the build itself
  // doesn't duplicate it
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript errors BLOCK the build (codebase reached 0 errors on 2026-07-07;
  // CI also runs `npm run typecheck` on every PR - keep it clean)
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig