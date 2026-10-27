"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal } from "@web3modal/wagmi/react";

import { BLOCKCHAIN_CONFIG } from "./constants";

// Get projectId at https://cloud.walletconnect.com
// TODO: Replace with your actual project ID
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

const metadata = {
  name: "Paystream Escrow",
  description: "Decentralized Paystream Escrow DApp",
  url: "https://web3modal.com", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Configure wagmi with Sepolia testnet
export const config = createConfig({
  chains: [sepolia],
  // No generic injected() connector: it goes through window.ethereum, which any installed wallet
  // (e.g. Phantom) can hijack. Wallets are discovered via EIP-6963 instead, each with its own provider.
  connectors: [],
  transports: {
    [sepolia.id]: http(BLOCKCHAIN_CONFIG.RPC_URL),
  },
  ssr: true,
});

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
  enableOnramp: true, // Optional - false as default
  metadata,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
