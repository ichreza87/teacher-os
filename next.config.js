/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Knowledge uploads: up to 10 MB per file (see knowledge/parser MAX_FILE_BYTES).
      bodySizeLimit: "12mb",
    },
    // pdf-parse v2 bundles pdfjs-dist, which breaks when webpack-bundled for RSC.
    // Keep it as a runtime require() instead (works natively in Node).
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};
module.exports = nextConfig;
