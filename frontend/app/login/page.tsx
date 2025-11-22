"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, useVerifyWallet } from "@/lib/hooks";

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

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if window.ethereum is available (MetaMask)
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask.");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      } as any);

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        // Verify wallet will be called in useEffect
      } else {
        throw new Error("No wallet accounts found");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect wallet. Please try again."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // Verify wallet once address is available
  useEffect(() => {
    if (walletAddress && !isVerifying) {
      verify();
    }
  }, [walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

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
                  : "Connect MetaMask"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Don't have a wallet?{" "}
              <a
                href="https://metamask.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Install MetaMask
              </a>
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
