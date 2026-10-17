// @ts-check
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The optimizer runs inside the container: it can't reach the gateway at localhost/media,
    // and Next 16 refuses local IPs anyway. The browser loads images from the gateway directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "product-service",
        port: "8000",
        pathname: "/media/product_images/**",
      },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
