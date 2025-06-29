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
  },
})

module.exports = withPWA({
  reactStrictMode: true,
})