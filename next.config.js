/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/img/cat1.png' }];
  },
};

module.exports = nextConfig;
