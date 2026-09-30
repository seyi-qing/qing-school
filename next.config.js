/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // local static logo; avoids optimizer issues on Vercel
  },
  eslint: {
    // Linting is run separately in CI; don't block local `next build` on it.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
