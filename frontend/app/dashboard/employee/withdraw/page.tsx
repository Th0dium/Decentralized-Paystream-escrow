"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, useEmployeeStreams } from "@/lib/hooks";

export default function WithdrawPage() {
  const { walletAddress } = useAuth();
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
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  const activeStreams = streams.filter((s) => !s.cancelled && !s.paused);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Withdraw Funds</h1>

      {activeStreams.length === 0 ? (
        <Card>
          <p className="text-center text-gray-600 py-8">
            No active streams available for withdrawal.
          </p>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleWithdraw} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
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
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-3">Stream Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-semibold">
                      {(
                        BigInt(selectedStream.totalAmount) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Withdrawn</p>
                    <p className="font-semibold">
                      {(
                        BigInt(selectedStream.withdrawn) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Escrowed</p>
                    <p className="font-semibold text-purple-600">
                      {(
                        BigInt(selectedStream.escrowed) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Escrow %</p>
                    <p className="font-semibold">
                      {(selectedStream.escrowBps / 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
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
