"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments } from "@/lib/hooks/useMyPayments";
import { withdrawStream } from "@/lib/contract-interaction";
import { formatUnits } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export default function WithdrawPage() {
  const { walletAddress, isEmployee } = useAuth();
  const { asEmployee: streams, isLoading: loading } = useMyPayments(walletAddress as any);
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedStream = streams.find((s) => s.paymentId === selectedStreamId);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStream) {
      setError("Please select a stream");
      return;
    }

    if (!selectedStream.claimableAmount || selectedStream.claimableAmount === 0n) {
        setError("No funds available to withdraw for this stream.");
        return;
    }

    setIsSubmitting(true);

    try {
      if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured");
      
      await withdrawStream(CONTRACT_ADDRESS as any, selectedStream.paymentId.toString());
      
      setSuccess(`Successfully withdrawn ${formatUnits(selectedStream.claimableAmount, 18)} tokens!`);
      // We might want to refetch here, but page reload is simple for now or let the hook auto-update on block
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
            💡 You don&apos;t have an employee role. Data shown below is for viewing only.
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
                  <option key={stream.paymentId} value={stream.paymentId}>
                    Stream #{stream.paymentId} (
                    {formatUnits(stream.streamAmount, 18)} tokens)
                  </option>
                ))}
              </select>
            </div>

            {selectedStream && (
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50">
                <h3 className="font-semibold mb-3 text-slate-100">Stream Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Total Stream Amount</p>
                    <p className="font-semibold text-slate-100">
                      {formatUnits(selectedStream.streamAmount, 18)} tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Already Withdrawn</p>
                    <p className="font-semibold text-slate-100">
                      {formatUnits(selectedStream.withdrawn, 18)} tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Available to Withdraw</p>
                    <p className="font-semibold text-green-400">
                      {selectedStream.claimableAmount ? formatUnits(selectedStream.claimableAmount, 18) : "0"} tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Escrowed (Milestones)</p>
                    <p className="font-semibold text-purple-400">
                      {formatUnits(selectedStream.escrowAmount, 18)} tokens
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
              disabled={!selectedStream || !selectedStream.claimableAmount || selectedStream.claimableAmount === 0n}
            >
              Withdraw Available Funds
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
