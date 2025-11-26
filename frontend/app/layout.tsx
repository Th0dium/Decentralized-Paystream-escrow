"use client";

import { Web3Modal } from "@web3modal/wagmi/react"; // Import Web3Modal component
import { config, projectId } from "@/lib/wallet-provider"; // Import config and projectId

import "./globals.css";
import { AppWalletProvider } from "@/lib/wallet-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppWalletProvider>
          {children}
          <Web3Modal
            projectId={projectId}
            wagmiConfig={config}
          />
        </AppWalletProvider>
      </body>
    </html>
  );
}
