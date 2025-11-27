"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { useAuth, useVerifyWallet } from "@/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, error: authError } = useAuth();
  const { verify, isVerifying } = useVerifyWallet();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: walletError } = useConnect();
  const { disconnect } = useDisconnect();

  const [hasAttemptedVerify, setHasAttemptedVerify] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isHydrated, router]);

  // Auto-verify wallet after connection
  useEffect(() => {
    if (!isHydrated || !address || !isConnected || isAuthenticated) return;
    if (hasAttemptedVerify || isVerifying) return;

    setHasAttemptedVerify(true);

    verify(address).then((result) => {
      if (!result.success) {
        setHasAttemptedVerify(false);
      }
    });
  }, [isHydrated, address, isConnected, isAuthenticated, hasAttemptedVerify, isVerifying, verify]);

  // Reset verification flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      setHasAttemptedVerify(false);
    }
  }, [isConnected]);

  const handleConnect = () => {
    console.log("🔌 Connect button clicked");
    console.log("Available connectors (all IDs):", connectors.map(c => ({ id: c.id, name: c.name })));

    // Try to find MetaMask - try multiple possible IDs
    let connector = connectors.find((c) => c.name?.toLowerCase().includes("metamask"));

    if (!connector) {
      connector = connectors.find((c) => c.id === "injected");
    }

    if (!connector && connectors.length > 0) {
      // Fallback: use first connector
      connector = connectors[0];
      console.log("⚠️ Using first available connector:", connector.name);
    }

    console.log("Selected connector:", connector?.name, "ID:", connector?.id);

    if (connector) {
      console.log("Attempting to connect...");
      connect({ connector });
    } else {
      console.error("❌ No connector found!");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setHasAttemptedVerify(false);
  };

  // Display error from either wallet connection or auth verification
  const displayError = walletError?.message || authError;
  const isLoading = isConnecting || isVerifying;

  // Debug: Log current state
  console.log("🔍 Login Page State:", {
    isHydrated,
    isAuthenticated,
    isConnected,
    isConnecting,
    isVerifying,
    hasAttemptedVerify,
    connectorsCount: connectors.length,
    hasError: !!displayError,
  });

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="relative max-w-md w-full">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4 shadow-2xl shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Paystream
          </h1>
          <p className="text-slate-400">Decentralized Salary Streaming & Escrow</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 backdrop-blur">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-slate-100 mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-slate-400">Connect with MetaMask to access the platform</p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400">Connection Error</h3>
                  <p className="text-sm text-red-300 mt-1">{displayError}</p>
                </div>
              </div>
            </div>
          )}

          {/* State: Wallet Connected - Verifying */}
          {isConnected && !isAuthenticated && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900/30 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
              <h3 className="text-lg font-medium text-slate-100 mb-2">Verifying Wallet</h3>
              <p className="text-sm text-slate-400 mb-4 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <button
                onClick={handleDisconnect}
                className="text-sm text-slate-400 hover:text-slate-200 underline"
                disabled={isLoading}
              >
                Disconnect
              </button>
            </div>
          )}

          {/* State: Wallet Not Connected - Show Connect Button */}
          {!isConnected && (
            <div className="space-y-4">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
                      <path
                        d="M38.67 10.34l-14.12-8.4a3.33 3.33 0 00-3.33 0L6.67 10.34a3.33 3.33 0 00-1.67 2.89v8.4a3.33 3.33 0 001.67 2.89l14.12 8.4a3.33 3.33 0 003.33 0l14.12-8.4a3.33 3.33 0 001.67-2.89v-8.4a3.33 3.33 0 00-1.67-2.89z"
                        fill="#E17726"
                      />
                      <path
                        d="M20 25.83V20l-5-2.5M20 25.83V20l5-2.5"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Connect MetaMask</div>
                    <div className="text-xs text-blue-100">Most popular wallet</div>
                  </div>
                </div>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* No Wallet Detected */}
              {walletError && !isConnected && connectors.length === 0 && (
                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <h3 className="font-medium text-slate-100 mb-2">No Wallet Detected</h3>
                    <p className="text-sm text-slate-400 mb-4">Install MetaMask to connect to the platform</p>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Install MetaMask
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            By connecting, you agree to our{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 font-medium">
              Terms of Service
            </a>
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-400">Secure</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs text-slate-400">Fast</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-400">Trusted</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
