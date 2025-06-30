const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  disable: false,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Fix pentru eroarea _ref is not defined
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'https-calls',
          networkTimeoutSeconds: 15,
          expiration: {
            maxEntries: 150,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
})

module.exports = withPWA({
  reactStrictMode: true,
  // Exclude firebase-messaging-sw.js from PWA
  webpack: (config: { externals: any[]; }) => {
    config.externals = [...(config.externals || []), { 'firebase-messaging-sw.js': 'self.firebase-messaging-sw' }];
    return config;
  },
})