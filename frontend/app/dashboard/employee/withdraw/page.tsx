"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, useEmployeeStreams } from "@/lib/hooks";

export default function WithdrawPage() {
  const { walletAddress, isEmployee } = useAuth();
  const { streams, loading } = useEmployeeStreams(walletAddress);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedStream = streams.find((s) => s.streamId === selectedStreamId);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStream || !amount) {
      setError("Please select a stream and enter an amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Call smart contract withdraw function
      // This will be implemented once wagmi is properly configured
      console.log("Withdrawing:", { streamId: selectedStreamId, amount });
      setSuccess(`Successfully withdrawn ${amount} tokens!`);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading...</div>
      </div>
    );
  }

  const activeStreams = streams.filter((s) => !s.cancelled && !s.paused);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Withdraw Funds</h1>

      {!isEmployee && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don't have an employee role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {activeStreams.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            No active streams available for withdrawal.
          </p>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleWithdraw} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                <p className="text-sm text-green-300">{success}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 text-slate-200">
                Select Stream
              </label>
              <select
                value={selectedStreamId || ""}
                onChange={(e) =>
                  setSelectedStreamId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="input-base"
              >
                <option value="">Choose a stream...</option>
                {activeStreams.map((stream) => (
                  <option key={stream.streamId} value={stream.streamId}>
                    Stream #{stream.streamId} (
                    {(
                      BigInt(stream.totalAmount) / BigInt(10 ** 18)
                    ).toString()}{" "}
                    tokens)
                  </option>
                ))}
              </select>
            </div>

            {selectedStream && (
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50">
                <h3 className="font-semibold mb-3 text-slate-100">Stream Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Total Amount</p>
                    <p className="font-semibold text-slate-100">
                      {(
                        BigInt(selectedStream.totalAmount) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Withdrawn</p>
                    <p className="font-semibold text-slate-100">
                      {(
                        BigInt(selectedStream.withdrawn) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Escrowed</p>
                    <p className="font-semibold text-purple-400">
                      {(
                        BigInt(selectedStream.escrowed) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 text-slate-200">
                Amount to Withdraw
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.001"
                className="input-base"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="w-full"
            >
              Withdraw Funds
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
