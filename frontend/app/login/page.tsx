"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useVerifyWallet } from "@/lib/hooks";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAccount, useConnect } from "wagmi";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, error: authError } = useAuth();
  const { verify, isVerifying } = useVerifyWallet();

  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors, error: walletError } = useConnect();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // When wallet is connected, verify the address
  useEffect(() => {
    if (address && !isAuthenticated) {
      verify(address);
    }
  }, [address, isAuthenticated, verify]);

  const displayError = walletError?.message || authError;
  const isLoading = isConnecting || isReconnecting || isVerifying;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to Paystream</h1>
        <p className="text-gray-600 mb-8">
          The decentralized solution for salary streams and milestone payments.
        </p>
        <Card>
          <div className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Connect Your Wallet</h2>
            {displayError && (
              <div className="p-3 mb-4 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{displayError}</p>
              </div>
            )}

            {isLoading && (
              <Button
                loading={true}
                className="w-full"
                variant="primary"
                disabled
              >
                {isVerifying ? "Verifying..." : "Connecting..."}
              </Button>
            )}

            {!isConnected && !isLoading && (
              <div className="flex flex-col space-y-3">
                {connectors.map((connector) => (
                  <Button
                    key={connector.id}
                    disabled={isLoading}
                    onClick={() => connect({ connector })}
                    className="w-full"
                    variant="primary"
                  >
                    {connector.name}
                    {isLoading &&
                      ' (connecting...)'}
                  </Button>
                ))}
              </div>
            )}
             {isConnected && !isAuthenticated && (
                <Button
                    loading={isVerifying}
                    className="w-full"
                    variant="primary"
                    disabled
                >
                    Verifying...
                </Button>
            )}

            {walletError?.name === 'ConnectorNotFoundError' && (
                 <div className="text-center mt-4">
                 <p className="mb-4 text-gray-700">
                   A wallet is not installed. Please install a wallet like MetaMask to continue.
                 </p>
                 <a
                   href="https://metamask.io/download/"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600"
                 >
                   Install MetaMask
                 </a>
               </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
