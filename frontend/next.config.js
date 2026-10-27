/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployment config lives in the repo; these override any env vars set on the host (e.g. Vercel dashboard)
  env: {
    NEXT_PUBLIC_CONTRACT_ADDRESS: "0xEF1ea8Adb57Ece1a196C0fF4A52dAd2C9eeDb071",
    NEXT_PUBLIC_RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/alch_gkoihJfcUK9LJHKYvs0Yt",
    // Free-tier Pinata key; it ships to the browser anyway (see README limitations)
    NEXT_PUBLIC_PINATA_JWT: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhOGQ3ZmRiZC1mYmEzLTRhMjAtYThmMC1lNDEwY2ZjMzY4ODMiLCJlbWFpbCI6Im5oYXRkdXkzMzU0QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI4NzVhZjg0MTA2NGIwMTRiODYyMyIsInNjb3BlZEtleVNlY3JldCI6Ijk5NDMzOThjNzE5NmZhMTAzODEzOTM4MjNmOWVmOTI3MjRkODY3Yzg0ZDczMjc0NWU1YzFlZjIxZTNhOTU5M2EiLCJleHAiOjE4MjQ2MDQ0NzJ9.acdNw00Ovc9i7nd5bgVFSdYth9Kz5-XvplxWWDYWQow",
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
