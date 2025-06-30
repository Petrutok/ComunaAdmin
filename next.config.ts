// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude firebase-messaging-sw.js din procesarea webpack
  webpack: (config: { externals: any[]; }) => {
    config.externals = [...(config.externals || []), { 'firebase-messaging-sw.js': 'self.firebase-messaging-sw' }];
    return config;
  },
}

module.exports = nextConfig

// PWA config salvată pentru mai târziu:
// npm install @ducanh2912/next-pwa
// const withPWA = require('@ducanh2912/next-pwa').default({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development'
// })