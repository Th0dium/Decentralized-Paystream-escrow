"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, useVerifyWallet } from "@/lib/hooks";

interface EthereumProvider {
  request: (args: { method: string }) => Promise<string[]>;
  isPhantom?: boolean;
}

declare global {
  interface Window {
    phantom?: {
      ethereum?: EthereumProvider;
    };
    ethereum?: EthereumProvider;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verify, isVerifying } = useVerifyWallet(walletAddress);

  // Redirect if already authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isHydrated, router]);

  const connectWallet = async (retryCount = 0) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log(`🔗 Starting wallet connection... (attempt ${retryCount + 1})`);
      console.log("Phantom available:", !!window.phantom?.ethereum);
      console.log("MetaMask available:", !!window.ethereum);

      // Check if Phantom is available first, then fall back to MetaMask
      const provider = window.phantom?.ethereum || window.ethereum;

      if (!provider) {
        throw new Error("No wallet extension found. Please install Phantom or MetaMask.");
      }

      console.log("✅ Wallet provider found");

      // Request account access
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      console.log("📝 Accounts received:", accounts);

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        console.log("🎯 Setting wallet address:", address);
        setWalletAddress(address);
        // Verify wallet will be called in useEffect
      } else {
        throw new Error("No wallet accounts found");
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to connect wallet. Please try again.";

      console.error("❌ Error:", errorMessage);

      // Retry logic for Phantom disconnection issues
      if (
        retryCount < 2 &&
        errorMessage.includes("disconnected") ||
        errorMessage.includes("Unexpected error")
      ) {
        console.log(`⏳ Retrying in 1 second... (attempt ${retryCount + 1})`);
        setIsConnecting(false);
        setTimeout(() => connectWallet(retryCount + 1), 1000);
        return;
      }

      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  // Verify wallet once address is available
  useEffect(() => {
    if (walletAddress && !isVerifying) {
      verify();
    }
  }, [walletAddress, verify, isVerifying]);

  if (!isHydrated) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md mx-auto px-4 py-20">
          <Card className="shadow-lg">
            <h1 className="text-3xl font-bold text-center mb-2">Sign In</h1>
            <p className="text-center text-gray-600 mb-8">
              Connect your wallet to get started
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isVerifying && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">
                  Verifying wallet... {walletAddress?.slice(0, 6)}...
                  {walletAddress?.slice(-4)}
                </p>
              </div>
            )}

            <Button
              onClick={connectWallet}
              variant="primary"
              loading={isConnecting || isVerifying}
              className="w-full mb-4"
            >
              {isConnecting
                ? "Connecting..."
                : isVerifying
                  ? "Verifying..."
                  : "Connect Phantom Wallet"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have a wallet?{" "}
              <a
                href="https://phantom.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Install Phantom
              </a>
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
