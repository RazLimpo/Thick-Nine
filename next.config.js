/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverComponentsExternalPackages: ['mongoose', 'mongodb'],
    },
  };
  
  module.exports = nextConfig;