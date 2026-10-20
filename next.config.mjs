/** @type {import('next').NextConfig} */
const nextConfig = {
  // Statik dışa aktarma: "out" klasörü oluşur, Cloudflare bunu yayınlar
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
