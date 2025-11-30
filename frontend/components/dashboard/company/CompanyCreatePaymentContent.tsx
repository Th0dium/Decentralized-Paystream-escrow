"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { WHITELISTED_TOKENS, Token } from "@/lib/tokens";
import { approveTokens, createPayment, getTokenBalance } from "@/lib/contract-interaction";
import { isAddress, formatUnits } from "viem";
import { useDashboardStore } from "@/lib/dashboard-store";
import { generateKeypair } from "@/lib/encryption";

export default function CompanyCreatePaymentContent() {
  const { walletAddress } = useAuth();
  const { setActiveDashboardView } = useDashboardStore();

  // Form State
  const [paymentName, setPaymentName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState<Token>(WHITELISTED_TOKENS[0]);

  // Stream Config
  const [isStreamEnabled, setIsStreamEnabled] = useState(true);
  const [streamAmount, setStreamAmount] = useState("");
  const [streamDuration, setStreamDuration] = useState("30"); // Default 30 days

  // Escrow Config
  const [isEscrowEnabled, setIsEscrowEnabled] = useState(false);
  const [escrowAmount, setEscrowAmount] = useState("");
  const [auditorAddress, setAuditorAddress] = useState("");

  // Transaction State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isApproved, setIsApproved] = useState(false); // Simplified approval tracking for UX

  // New State for Secret Key Display
  const [createdAuditorSecretKey, setCreatedAuditorSecretKey] = useState<string | null>(null);

  // Fetch user balance for selected token
  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress || !selectedToken) return;
      try {
        const bal = await getTokenBalance(selectedToken.address as any, walletAddress as any);
        setBalance(formatUnits(BigInt(bal), selectedToken.decimals));
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };
    fetchBalance();
  }, [walletAddress, selectedToken]);

  const calculateTotal = () => {
    const sAmount = isStreamEnabled ? parseFloat(streamAmount || "0") : 0;
    const eAmount = isEscrowEnabled ? parseFloat(escrowAmount || "0") : 0;
    return sAmount + eAmount;
  };

  const handleApprove = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const total = calculateTotal();
      if (total <= 0) throw new Error("Total amount must be greater than 0");

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      await approveTokens(
        selectedToken.address as any,
        contractAddress as any,
        total.toString(),
        selectedToken.decimals
      );
      setIsApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (!paymentName) throw new Error("Payment name is required");
      if (!isAddress(recipientAddress)) throw new Error("Invalid recipient address");

      const total = calculateTotal();
      if (total <= 0) throw new Error("Total amount must be greater than 0");
      if (parseFloat(balance) < total) throw new Error("Insufficient token balance");

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      // Prepare amounts
      const sAmount = isStreamEnabled ? streamAmount || "0" : "0";
      const eAmount = isEscrowEnabled ? escrowAmount || "0" : "0";
      const duration = isStreamEnabled ? parseInt(streamDuration) : 0;

      const finalDuration = duration > 0 ? duration : 1;
      const finalAuditor = auditorAddress || walletAddress; // If blank, assign self

      // Generate auditor keypair (public key will be stored on-chain, secret key stored locally)
      console.log("🔐 Generating auditor keypair for encryption...");
      const { publicKey: auditorPublicKey, secretKey: auditorSecretKey } = generateKeypair();
      console.log(`✅ Public Key (for contract): ${auditorPublicKey.substring(0, 20)}...`);
      
      // We don't log the secret key here anymore since we display it in the UI

      await createPayment(
        contractAddress as any,
        paymentName,
        recipientAddress as any,
        finalAuditor as any,
        auditorPublicKey,
        selectedToken.address as any,
        sAmount,
        eAmount,
        finalDuration,
        selectedToken.decimals
      );

      // Success! Don't redirect yet. Show key.
      setCreatedAuditorSecretKey(auditorSecretKey);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Success View with Key Reveal
  if (createdAuditorSecretKey) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-green-400">Payment Created Successfully!</h1>
            </div>
            <Card className="border-green-500/50 bg-green-900/10">
                <div className="p-4 text-center space-y-6">
                    <div className="text-6xl">🔐</div>
                    <h2 className="text-xl font-bold text-slate-100">Save the Auditor Secret Key</h2>
                    <p className="text-slate-300 max-w-xl mx-auto">
                        A unique encryption key has been generated for this payment&apos;s auditor.
                        <br/>
                        <strong className="text-red-400">You must copy this key and send it securely to the Auditor.</strong>
                        <br/>
                        Without this key, they cannot decrypt and review the evidence.
                    </p>

                    <div className="bg-slate-950 border border-slate-700 p-4 rounded-lg relative max-w-2xl mx-auto">
                        <p className="font-mono text-sm text-green-300 break-all select-all">
                            {createdAuditorSecretKey}
                        </p>
                    </div>

                    <div className="pt-4">
                        <Button
                            variant="primary"
                            onClick={() => setActiveDashboardView('company-streams')}
                            className="w-48"
                        >
                            I have saved the key
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-100">Create New Payment</h1>
        <Button variant="secondary" onClick={() => setActiveDashboardView('company-streams')}>
          Back to List
        </Button>
      </div>

      <Card>
        {/* Top Section: Payment Name, Recipient & Token */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Payment Name / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Salary - John Doe"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={paymentName}
              onChange={(e) => setPaymentName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Recipient Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Select Token
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedToken.address}
              onChange={(e) => {
                const token = WHITELISTED_TOKENS.find(t => t.address === e.target.value);
                if (token) {
                  setSelectedToken(token);
                  setIsApproved(false); // Reset approval on token change
                }
              }}
            >
              {WHITELISTED_TOKENS.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1">
              Balance: {balance} {selectedToken.symbol}
            </div>
          </div>
        </div>

        {/* Middle Section: Configuration Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left: Stream Salary */}
          <div className={`p-6 rounded-xl border transition-all ${isStreamEnabled ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 opacity-75'}`}>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="enableStream"
                className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                checked={isStreamEnabled}
                onChange={(e) => setIsStreamEnabled(e.target.checked)}
              />
              <label htmlFor="enableStream" className="text-lg font-semibold text-slate-100 cursor-pointer">
                Stream Salary
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Stream Amount ({selectedToken.symbol})</label>
                <input
                  type="number"
                  disabled={!isStreamEnabled}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={streamAmount}
                  onChange={(e) => setStreamAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  disabled={!isStreamEnabled}
                  placeholder="30"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={streamDuration}
                  onChange={(e) => setStreamDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right: Escrows */}
          <div className={`p-6 rounded-xl border transition-all ${isEscrowEnabled ? 'bg-purple-900/10 border-purple-500/50' : 'bg-slate-800/50 border-slate-700 opacity-75'}`}>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="enableEscrow"
                className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                checked={isEscrowEnabled}
                onChange={(e) => setIsEscrowEnabled(e.target.checked)}
              />
              <label htmlFor="enableEscrow" className="text-lg font-semibold text-slate-100 cursor-pointer">
                Escrow Fund
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Escrow Amount ({selectedToken.symbol})</label>
                <input
                  type="number"
                  disabled={!isEscrowEnabled}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={escrowAmount}
                  onChange={(e) => setEscrowAmount(e.target.value)}
                />
              </div>
              <div className="bg-slate-900/50 p-3 rounded text-sm text-slate-400 mt-8">
                <label htmlFor="auditor-address" className="block text-slate-300 text-sm font-bold mb-2">
                  Auditor Address
                </label>
                <input
                  id="auditor-address"
                  type="text"
                  placeholder="Leave blank to assign yourself as auditor"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 disabled:opacity-50"
                  value={auditorAddress}
                  onChange={(e) => setAuditorAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Transaction Summary */}
        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Transaction Summary</h3>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Stream Allocation:</span>
              <span>{isStreamEnabled ? streamAmount || "0" : "0"} {selectedToken.symbol}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Escrow Allocation:</span>
              <span>{isEscrowEnabled ? escrowAmount || "0" : "0"} {selectedToken.symbol}</span>
            </div>
            <div className="h-px bg-slate-700 my-2"></div>
            <div className="flex justify-between text-lg font-bold text-white">
              <span>Grand Total:</span>
              <span>{calculateTotal()} {selectedToken.symbol}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <Button
              variant="secondary"
              onClick={handleApprove}
              loading={isLoading && !isApproved}
              disabled={isApproved || isLoading || calculateTotal() <= 0}
            >
              {isApproved ? "Approved" : `1. Approve ${selectedToken.symbol}`}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreatePayment}
              loading={isLoading && isApproved}
              disabled={!isApproved || isLoading || calculateTotal() <= 0}
            >
              2. Create Payment
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}