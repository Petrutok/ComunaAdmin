// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // ACTIVĂM MODUL CAPACITOR DIRECT
  output: 'export',  // Export static pentru Capacitor
  
  // Dezactivează optimizarea imaginilor pentru Capacitor
  images: {
    unoptimized: true,
  },
  
  // Trailing slash pentru navigare corectă în app
  trailingSlash: true,
  
  // Webpack config pentru firebase și alte externals
  webpack: (config: any) => {
    config.externals = [...(config.externals || []), { 
      'firebase-messaging-sw.js': 'self.firebase-messaging-sw' 
    }];
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: 'https://primaria.digital',  // URL-ul tău de producție
    NEXT_PUBLIC_IS_MOBILE: 'true',  // Pentru Capacitor
  },
  
  // Pentru build-ul Capacitor
  eslint: {
    ignoreDuringBuilds: false,  // Păstrăm verificările
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig