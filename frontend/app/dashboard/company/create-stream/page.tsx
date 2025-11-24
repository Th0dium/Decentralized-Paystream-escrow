"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TokenSelector } from "@/components/TokenSelector";
import { approveTokens, createStream, checkNetwork } from "@/lib/contract-interaction";
import { Token } from "@/lib/tokens";

export default function CreateStreamPage() {
  const [formData, setFormData] = useState({
    employeeAddress: "",
    totalAmount: "",
    duration: 30, // days
    escrowPercentage: 30,
  });
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "employeeAddress" || name === "totalAmount"
          ? value
          : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTransactionHash(null);

    // Validation
    if (!formData.employeeAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid Employee Ethereum address");
      return;
    }

    if (!selectedToken) {
      setError("Please select a token");
      return;
    }

    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (formData.duration < 1 || formData.duration > 365) {
      setError("Duration must be between 1 and 365 days");
      return;
    }

    if (formData.escrowPercentage < 0 || formData.escrowPercentage > 100) {
      setError("Escrow percentage must be between 0 and 100");
      return;
    }

    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");

      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      console.log("\n🚀 Starting stream creation process...");

      // Check network
      console.log("🔍 Checking network...");
      const correctNetwork = await checkNetwork(chainId);
      if (!correctNetwork) {
        throw new Error(`Please switch to the correct network (chain ID: ${chainId})`);
      }

      // Step 1: Approve tokens
      console.log("\n📝 Step 1: Approving tokens...");
      const approvalHash = await approveTokens(
        selectedToken.address,
        contractAddress,
        formData.totalAmount
      );
      console.log(`✅ Approval hash: ${approvalHash}`);

      // Step 2: Create stream
      console.log("\n📝 Step 2: Creating stream...");
      const result = await createStream(
        contractAddress,
        formData.employeeAddress,
        selectedToken.address,
        formData.totalAmount,
        formData.duration,
        formData.escrowPercentage
      );

      console.log(`\n✅ Stream created successfully!`);
      console.log(`Transaction hash: ${result.transactionHash}`);

      setSuccess("Stream created successfully! Check Etherscan for transaction details.");
      setTransactionHash(result.transactionHash);

      // Reset form
      setFormData({
        employeeAddress: "",
        totalAmount: "",
        duration: 30,
        escrowPercentage: 30,
      });
      setSelectedToken(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create stream";
      console.error("❌ Error creating stream:", errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const durationInSeconds = formData.duration * 24 * 60 * 60;
  const escrowAmount =
    formData.totalAmount &&
    (parseFloat(formData.totalAmount) * formData.escrowPercentage) / 100;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Salary Stream</h1>

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

          <div>
            <label className="block text-sm font-medium mb-2">
              Employee Wallet Address
            </label>
            <input
              type="text"
              name="employeeAddress"
              value={formData.employeeAddress}
              onChange={handleChange}
              placeholder="0x..."
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a valid Ethereum address
            </p>
          </div>

          <TokenSelector
            value={selectedToken?.address || ""}
            onChange={setSelectedToken}
            label="Token (ERC20)"
            allowCustom={true}
          />

          <div>
            <label className="block text-sm font-medium mb-2">
              Total Amount (Tokens)
            </label>
            <input
              type="number"
              name="totalAmount"
              value={formData.totalAmount}
              onChange={handleChange}
              placeholder="0.0"
              step="0.001"
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the total amount to fund this stream
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              max="365"
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stream duration: {durationInSeconds.toLocaleString()} seconds
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Escrow Percentage (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                name="escrowPercentage"
                value={formData.escrowPercentage}
                onChange={handleChange}
                min="0"
                max="100"
                className="flex-1"
              />
              <span className="text-lg font-semibold w-12">
                {formData.escrowPercentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Percentage of withdrawn funds locked in escrow for milestones
            </p>
          </div>

          {formData.totalAmount && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-3">Stream Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="font-semibold">
                    {parseFloat(formData.totalAmount).toFixed(6)} tokens
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p className="font-semibold">{formData.duration} days</p>
                </div>
                <div>
                  <p className="text-gray-600">Escrowed Amount</p>
                  <p className="font-semibold text-purple-600">
                    {(escrowAmount || 0).toFixed(6)} tokens
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Payout Amount</p>
                  <p className="font-semibold">
                    {(
                      parseFloat(formData.totalAmount) - (escrowAmount || 0)
                    ).toFixed(6)}{" "}
                    tokens
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            className="w-full"
          >
            Create Stream
          </Button>
        </form>
      </Card>
    </div>
  );
}
