/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Large multipart audio uploads (Route Handlers still benefit from Node body limits in dev)
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
