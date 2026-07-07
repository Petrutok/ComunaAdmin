// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // REMOVED: output: 'export' - Need API routes for IMAP email fetching
  // If you need static export for mobile, you can build separately or use ISR

  // Dezactivează optimizarea imaginilor
  images: {
    unoptimized: true,
  },

  // Trailing slash pentru navigare corectă
  trailingSlash: true,
  
  // Webpack config pentru firebase
  webpack: (config: { externals: any[]; }) => {
    config.externals = [...(config.externals || []), { 
      'firebase-messaging-sw.js': 'self.firebase-messaging-sw' 
    }];
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'https://primaria.digital',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },
  
  // ESLint still has legacy findings - lint stays advisory for now
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