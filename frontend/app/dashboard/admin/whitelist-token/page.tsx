"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { isTokenWhitelisted, whitelistToken } from "@/lib/whitelist-utility";
import { Address } from "viem";

export default function WhitelistTokenPage() {
  const { address: userAddress } = useAccount();
  const [tokenAddress, setTokenAddress] = useState("");
  const [contractAddress, setContractAddress] = useState(
    "0x55225ca36FF331838223194E8Edac30BA5B0600c"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);

  const handleCheckWhitelist = async () => {
    if (!tokenAddress) {
      setError("Please enter a token address");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await isTokenWhitelisted(
        contractAddress as Address,
        tokenAddress as Address
      );
      setIsWhitelisted(result);
      setMessage(
        result
          ? "✅ Token is whitelisted"
          : "❌ Token is NOT whitelisted"
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check whitelist status"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistToken = async () => {
    if (!tokenAddress) {
      setError("Please enter a token address");
      return;
    }

    if (!userAddress) {
      setError("Please connect your wallet");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const hash = await whitelistToken(
        contractAddress as Address,
        tokenAddress as Address
      );

      if (hash) {
        setMessage(
          `✅ Whitelist transaction sent! Hash: ${hash}`
        );
        // Check status after a delay
        setTimeout(() => {
          handleCheckWhitelist();
        }, 5000);
      } else {
        setMessage("✅ Token is already whitelisted");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to whitelist token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <Card className="max-w-2xl mx-auto bg-slate-800 border-slate-700">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Token Whitelist Manager
          </h1>
          <p className="text-slate-400 mb-8">
            Admin tool to whitelist tokens on the Paystream contract
          </p>

          {/* Connected Address */}
          <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400">Connected Account:</p>
            <p className="text-white font-mono text-sm">
              {userAddress ? userAddress : "Not connected"}
            </p>
          </div>

          {/* Contract Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Contract Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Token Address */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Token Address to Whitelist
            </label>
            <input
              type="text"
              placeholder="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              Default: Sepolia USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
            </p>
          </div>

          {/* Status Display */}
          {isWhitelisted !== null && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                isWhitelisted
                  ? "bg-green-900/20 border-green-600 text-green-400"
                  : "bg-red-900/20 border-red-600 text-red-400"
              }`}
            >
              {isWhitelisted ? "✅ Token is whitelisted" : "❌ Token is NOT whitelisted"}
            </div>
          )}

          {/* Messages */}
          {message && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg text-green-400 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleCheckWhitelist}
              disabled={loading || !tokenAddress}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Checking..." : "Check Whitelist Status"}
            </Button>

            <Button
              onClick={handleWhitelistToken}
              disabled={loading || !tokenAddress || !userAddress}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Processing..." : "Whitelist Token"}
            </Button>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-300">
            <h3 className="font-semibold text-white mb-2">ℹ️ Important Notes:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Only the contract admin can whitelist tokens</li>
              <li>
                Default contract: {contractAddress}
              </li>
              <li>
                Default token: Sepolia USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
              </li>
              <li>After whitelisting, payment creation should work</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
