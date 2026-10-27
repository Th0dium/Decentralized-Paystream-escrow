/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployment config lives in the repo; these override any env vars set on the host (e.g. Vercel dashboard)
  env: {
    NEXT_PUBLIC_CONTRACT_ADDRESS: "0xEF1ea8Adb57Ece1a196C0fF4A52dAd2C9eeDb071",
    NEXT_PUBLIC_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/alch_gkoihJfcUK9LJHKYvs0Yt",
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      // Optional x402 payment deps pulled in by wagmi connectors; unused here
      "@x402/core": false,
      "@x402/evm": false,
      "@x402/svm": false,
    };
    return config;
  },
};

module.exports = nextConfig;
