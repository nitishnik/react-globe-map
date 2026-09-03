import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-globe.gl', 'globe.gl', 'three'],
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
