/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared package ships TypeScript sources compiled to ESM; Next needs to
  // run them through its own pipeline rather than treating them as an external.
  transpilePackages: ['@mom/shared'],
  eslint: { ignoreDuringBuilds: true }, // the root flat config lints this app
  async rewrites() {
    const api = process.env.API_URL ?? 'http://localhost:4000';
    return [{ source: '/api/v1/:path*', destination: `${api}/api/v1/:path*` }];
  },
};
export default nextConfig;
