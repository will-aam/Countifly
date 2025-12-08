// next.config.mjs
import fs from "fs";
import path from "path";

/** @type {import('next').NextConfig} */

// --- LEITURA SEGURA DA VERSÃO ---
let appVersion = "v1.0.0";

try {
  // Tenta ler o arquivo gerado pelo nosso script
  const versionPath = path.join(process.cwd(), "version.json");
  if (fs.existsSync(versionPath)) {
    const versionData = JSON.parse(fs.readFileSync(versionPath, "utf8"));
    appVersion = versionData.version;
    console.log(`🔹 Next.js carregou versão: ${appVersion}`);
  }
} catch (e) {
  console.warn("⚠️ Não foi possível ler version.json. Usando v1.0.0");
}
// --------------------------------

const nextConfig = {
  // Expõe a variável para o Frontend
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },

  // Suas configurações existentes...
  experimental: {
    optimizePackageImports: ["lucide-react", "@/components/ui"],
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            enforce: true,
          },
        },
      };
    }
    return config;
  },

  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true,
  },

  compress: true,

  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(ico|png|jpg|jpeg|gif|webp|svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
