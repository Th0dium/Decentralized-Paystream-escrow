"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TokenSelector } from "@/components/TokenSelector";
import { approveTokens, createStream } from "@/lib/contract-interaction";
import { Token, WHITELISTED_TOKENS } from "@/lib/tokens";
import { Address } from "viem";

interface EscrowItem {
  id: string;
  amount: string;
  deadline: string;
  description: string;
}

export default function CreateStreamPage() {
  const { address: account, chainId, isConnected } = useAccount();

  const [enablePaystream, setEnablePaystream] = useState(true);
  const [enableEscrow, setEnableEscrow] = useState(false);

  const [formData, setFormData] = useState({
    employeeAddress: "",
    paystreamAmount: "",
    paystreamDuration: 30, // days
  });

  const [escrowItems, setEscrowItems] = useState<EscrowItem[]>([
    { id: "1", amount: "", deadline: "", description: "" },
  ]);

  const [selectedToken, setSelectedToken] = useState<Token>(WHITELISTED_TOKENS[0]);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const expectedChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");
  const isCorrectNetwork = isConnected && chainId === expectedChainId;

  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      setError(`Please switch to the correct network (chain ID: ${expectedChainId})`);
    } else {
      setError(null);
    }
  }, [isConnected, isCorrectNetwork, expectedChainId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "employeeAddress" || name === "paystreamAmount"
          ? value
          : parseInt(value),
    }));
  };

  const handleEscrowItemChange = (
    id: string,
    field: keyof EscrowItem,
    value: string
  ) => {
    setEscrowItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addEscrowItem = () => {
    const newId = String(Math.max(...escrowItems.map((i) => parseInt(i.id) || 0)) + 1);
    setEscrowItems((prev) => [
      ...prev,
      { id: newId, amount: "", deadline: "", description: "" },
    ]);
  };

  const removeEscrowItem = (id: string) => {
    if (escrowItems.length > 1) {
      setEscrowItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
    setShowTokenSelector(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTransactionHash(null);

    if (!isCorrectNetwork || !account) {
      setError("Please connect your wallet and ensure you are on the correct network.");
      return;
    }

    // Validation
    if (!enablePaystream && !enableEscrow) {
      setError("Please select at least one payment method (Paystream or Escrow)");
      return;
    }

    if (!formData.employeeAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid Employee Ethereum address");
      return;
    }

    if (enablePaystream && (!formData.paystreamAmount || parseFloat(formData.paystreamAmount) <= 0)) {
      setError("Please enter a valid paystream amount");
      return;
    }

    if (enablePaystream && (formData.paystreamDuration < 1 || formData.paystreamDuration > 365)) {
      setError("Paystream duration must be between 1 and 365 days");
      return;
    }

    if (enableEscrow) {
      if (escrowItems.length === 0) {
        setError("Please add at least one escrow milestone");
        return;
      }

      for (const item of escrowItems) {
        if (!item.amount || parseFloat(item.amount) <= 0) {
          setError("All escrow milestones must have a valid amount");
          return;
        }
        if (!item.deadline) {
          setError("All escrow milestones must have a deadline");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      console.log("\n🚀 Starting stream creation process...");

      // Calculate total amount from paystream and escrow
      const paystreamAmt = enablePaystream ? parseFloat(formData.paystreamAmount || "0") : 0;
      const escrowAmt = escrowItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);
      const totalAmount = paystreamAmt + escrowAmt;

      // Step 1: Approve tokens
      console.log("\n📝 Step 1: Approving tokens...");
      const approvalHash = await approveTokens(
        selectedToken.address as Address,
        contractAddress,
        totalAmount.toString(),
        selectedToken.decimals
      );
      console.log(`✅ Approval hash: ${approvalHash}`);

      // Step 2: Create stream
      console.log("\n📝 Step 2: Creating payment stream...");

      // Use paystream duration
      const duration = formData.paystreamDuration;

      const result = await createStream(
        contractAddress,
        formData.employeeAddress as Address,
        selectedToken.address as Address,
        totalAmount.toString(),
        duration,
        selectedToken.decimals
      );

      console.log(`\n✅ Stream created successfully!`);
      console.log(`Transaction hash: ${result.transactionHash}`);

      setSuccess("Stream created successfully! Check Etherscan for transaction details.");
      setTransactionHash(result.transactionHash);

      // Reset form
      setFormData({
        employeeAddress: "",
        paystreamAmount: "",
        paystreamDuration: 30,
      });
      setEscrowItems([{ id: "1", amount: "", deadline: "", description: "" }]);
      setEnablePaystream(true);
      setEnableEscrow(false);
      setSelectedToken(WHITELISTED_TOKENS[0]); // Reset to default
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create stream";
      console.error("❌ Error creating stream:", errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paystreamDurationInSeconds = formData.paystreamDuration * 24 * 60 * 60;
  const paystreamAmount = parseFloat(formData.paystreamAmount || "0") || 0;
  const totalEscrowAmount = escrowItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount || "0") || 0),
    0
  );
  const totalAmount = paystreamAmount + totalEscrowAmount;

  if (!isConnected) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Create Payment</h1>
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-600">Please connect your wallet to create a payment.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Create Payment</h1>

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

          <fieldset disabled={!isCorrectNetwork || isSubmitting}>
            {/* Employee Address */}
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

            {/* Payment Method - Two Tables Side by Side */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* Paystream Table */}
                <div className={`border-2 rounded-lg transition-all ${enablePaystream ? 'border-blue-400 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="p-4 border-b">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePaystream}
                        onChange={(e) => setEnablePaystream(e.target.checked)}
                        className="w-5 h-5 mr-3"
                      />
                      <div>
                        <span className="font-semibold text-lg block">💰 Paystream</span>
                        <span className="text-xs text-gray-600">Continuous streaming payment</span>
                      </div>
                    </label>
                  </div>
                  <div className={`p-4 space-y-4 ${!enablePaystream ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Amount ({selectedToken.symbol})
                      </label>
                      <input
                        type="number"
                        name="paystreamAmount"
                        value={formData.paystreamAmount}
                        onChange={handleChange}
                        placeholder="0.0"
                        step="0.001"
                        disabled={!enablePaystream}
                        className="input-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Amount to stream continuously
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        name="paystreamDuration"
                        value={formData.paystreamDuration}
                        onChange={handleChange}
                        min="1"
                        max="365"
                        disabled={!enablePaystream}
                        className="input-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Stream duration: {paystreamDurationInSeconds.toLocaleString()} seconds
                      </p>
                    </div>
                    {enablePaystream && paystreamAmount > 0 && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm text-gray-700">
                          Daily rate: <span className="font-semibold">{(paystreamAmount / formData.paystreamDuration).toFixed(6)} {selectedToken.symbol}/day</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Escrow Table */}
                <div className={`border-2 rounded-lg transition-all ${enableEscrow ? 'border-purple-400 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="p-4 border-b">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableEscrow}
                        onChange={(e) => setEnableEscrow(e.target.checked)}
                        className="w-5 h-5 mr-3"
                      />
                      <div>
                        <span className="font-semibold text-lg block">🎯 Escrow</span>
                        <span className="text-xs text-gray-600">Milestone-based payment</span>
                      </div>
                    </label>
                  </div>
                  <div className={`p-4 space-y-3 max-h-96 overflow-y-auto ${!enableEscrow ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="text-sm text-gray-600">
                      Configure milestones for escrow payment
                    </p>

                    {escrowItems.map((item, index) => (
                      <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-xs">Milestone {index + 1}</span>
                          {escrowItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEscrowItem(item.id)}
                              disabled={!enableEscrow}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium mb-1">Amount ({selectedToken.symbol})</label>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleEscrowItemChange(item.id, "amount", e.target.value)}
                              placeholder="0.0"
                              step="0.001"
                              disabled={!enableEscrow}
                              className="input-base text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Deadline</label>
                            <input
                              type="date"
                              value={item.deadline}
                              onChange={(e) => handleEscrowItemChange(item.id, "deadline", e.target.value)}
                              disabled={!enableEscrow}
                              className="input-base text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Description</label>
                            <textarea
                              value={item.description}
                              onChange={(e) => handleEscrowItemChange(item.id, "description", e.target.value)}
                              placeholder="E.g., Complete phase 1"
                              disabled={!enableEscrow}
                              className="input-base text-sm"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addEscrowItem}
                      disabled={!enableEscrow}
                      className="w-full px-3 py-2 border border-purple-300 text-purple-600 font-medium rounded-lg hover:bg-purple-100 transition text-sm"
                    >
                      + Add Milestone
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Currency (ERC20)</label>
              {showTokenSelector ? (
                <TokenSelector
                  value={selectedToken.address}
                  onChange={handleTokenChange}
                />
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedToken.logo || "💰"}</span>
                    <span className="font-semibold">{selectedToken.symbol} - {selectedToken.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenSelector(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Stream Summary */}
            {totalAmount > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="mb-3">
                  <h3 className="font-semibold">Stream Summary</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Breakdown of your payment
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                    <span className="text-gray-700">
                      Total Amount to Employee
                    </span>
                    <span className="font-bold text-lg">
                      {totalAmount.toFixed(2)} {selectedToken.symbol}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {enablePaystream && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 flex items-center">
                            <span className="text-lg mr-2">💰</span>Paystream
                          </span>
                          <span className="font-semibold">
                            {paystreamAmount.toFixed(2)} {selectedToken.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">
                          {formData.paystreamDuration} days • {(paystreamAmount / formData.paystreamDuration).toFixed(2)} {selectedToken.symbol}/day
                        </p>
                      </div>
                    )}
                    {enableEscrow && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 flex items-center">
                            <span className="text-lg mr-2">🎯</span>Escrow Milestones
                          </span>
                          <span className="font-semibold text-purple-600">
                            {totalEscrowAmount.toFixed(2)} {selectedToken.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-6">
                          {escrowItems.length} milestone{escrowItems.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-xs text-gray-600 text-center">
                      ℹ️ Includes platform fees and gas costs calculated at transaction time
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
              disabled={!isCorrectNetwork || isSubmitting}
            >
              Create Payment
            </Button>
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
