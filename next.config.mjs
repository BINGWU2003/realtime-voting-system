/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化构建过程
  experimental: {
    // 提高构建性能
    optimisticClientCache: false,
  },

  // 配置Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client')
    }
    return config
  },

  // 跳过API路由的静态导出
  output: 'standalone',

  // 确保SSE连接正常工作
  headers: async () => {
    return [
      {
        source: '/api/sse/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ]
  },
}

export default nextConfig
