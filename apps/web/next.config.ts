import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@car-spa/shared',
    '@car-spa/domain',
    '@car-spa/application',
    '@car-spa/infrastructure',
  ],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Content-Security-Policy',
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com http://127.0.0.1:* http://localhost:*; frame-src https://www.google.com;",
        },
      ],
    },
  ],
};

export default nextConfig;
