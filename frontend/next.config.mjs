/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:8000';
    return [
      { source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` },
      { source: '/health', destination: `${backend}/health` }
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' }
      ]
    }];
  }
};

export default nextConfig;
