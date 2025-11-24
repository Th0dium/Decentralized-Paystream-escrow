"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TokenSelector } from "@/components/TokenSelector";
import { useAuth } from "@/lib/hooks";
import { approveTokens } from "@/lib/contract-interaction";
import { Token } from "@/lib/tokens";

export default function DepositPage() {
  const { walletAddress } = useAuth();
  const [formData, setFormData] = useState({
    amount: "",
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTransactionHash(null);

    // Validation
    if (!selectedToken) {
      setError("Please select a token");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      console.log("\n🚀 Starting token deposit process...");
      console.log(`💰 Token: ${selectedToken.symbol} (${selectedToken.address})`);
      console.log(`📊 Amount: ${formData.amount}`);
      console.log(`👤 Wallet: ${walletAddress}`);

      // Approve tokens for the contract
      console.log("\n📝 Step 1: Approving tokens...");
      const approvalHash = await approveTokens(
        selectedToken.address,
        contractAddress,
        formData.amount
      );
      console.log(`✅ Approval hash: ${approvalHash}`);

      // Note: The actual deposit logic would depend on your contract
      // For now, we're just showing the approval flow
      // You'll need to implement a deposit function in the contract

      setSuccess("Tokens approved successfully! You can now use them in the platform.");
      setTransactionHash(approvalHash);

      // Reset form
      setFormData({
        amount: "",
      });
      setSelectedToken(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to deposit tokens";
      console.error("❌ Error depositing tokens:", errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Deposit Tokens</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
              {transactionHash && (
                <p className="text-xs text-gray-600 mt-2 font-mono break-all">
                  Tx: {transactionHash}
                </p>
              )}
            </div>
          )}

          <TokenSelector
            value={selectedToken?.address || ""}
            onChange={setSelectedToken}
            label="Select Token to Deposit"
            allowCustom={true}
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              Amount to Deposit
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.0"
              step="0.001"
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the amount of tokens you want to deposit
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Select a token from the dropdown</li>
              <li>Specify the amount you want to deposit</li>
              <li>Click "Approve & Deposit Tokens"</li>
              <li>Confirm the transaction in your wallet</li>
              <li>Use the approved tokens to create salary streams</li>
            </ul>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700">
              <strong>Supported Tokens:</strong> Any ERC20 token on Sepolia testnet
              (SOL-wrapped, ETH, BTC-wrapped, USDC, DAI, etc.)
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full"
          >
            Approve & Deposit Tokens
          </Button>
        </form>
      </Card>
    </div>
  );
}
