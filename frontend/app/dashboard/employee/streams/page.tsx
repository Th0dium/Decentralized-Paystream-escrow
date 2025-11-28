"use client";

import { Card } from "@/components/Card";
import { useAuth } from "@/lib/hooks";
import { useMyPayments } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import { useState } from "react";
import { withdrawStream } from "@/lib/contract-interaction";

const ITEMS_PER_PAGE = 10;

export default function EmployeeStreamsPage() {
  const { walletAddress, isEmployee } = useAuth();
  const { asEmployee: streams, isLoading: loading, error } = useMyPayments(walletAddress as any);
  const [currentPage, setCurrentPage] = useState(1);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);

  // Client-side pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedStreams = streams.slice(startIdx, endIdx);
  const totalPages = Math.ceil(streams.length / ITEMS_PER_PAGE);

  const handleWithdraw = async (paymentId: number) => {
    try {
      setWithdrawing(paymentId);
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      await withdrawStream(contractAddress as any, paymentId.toString());
      // Refetch after withdraw
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Withdraw failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setWithdrawing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading streams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-400">Error: {error}</div>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">My Salary Streams</h1>

      {!isEmployee && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have an employee role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {streams.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            You have no active streams. Contact your company to create one.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {paginatedStreams.map((stream) => (
              <Card key={stream.paymentId}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      Stream #{stream.paymentId}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Company: {stream.company.slice(0, 6)}...
                      {stream.company.slice(-4)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      stream.cancelled
                        ? "bg-red-900/30 text-red-300"
                        : stream.paused
                          ? "bg-yellow-900/30 text-yellow-300"
                          : "bg-green-900/30 text-green-300"
                    }`}
                  >
                    {stream.cancelled ? "Cancelled" : stream.paused ? "Paused" : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-slate-400">Stream Amount</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {formatUnits(stream.streamAmount, 18)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Claimable</div>
                    <div className="text-lg font-semibold text-green-400">
                      {stream.claimableAmount ? formatUnits(stream.claimableAmount, 18) : "0"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Withdrawn</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {formatUnits(stream.withdrawn, 18)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Progress</div>
                    <div className="text-lg font-semibold text-blue-400">{stream.progress}%</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-700 rounded h-2 mb-4">
                  <div
                    className="bg-green-500 h-2 rounded transition-all"
                    style={{ width: `${stream.progress}%` }}
                  />
                </div>

                <div className="text-sm text-slate-400 mb-4">
                  <p>Start: {new Date(Number(stream.startTime) * 1000).toLocaleDateString()}</p>
                  <p>End: {new Date(Number(stream.stopTime) * 1000).toLocaleDateString()}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded text-sm transition"
                    onClick={() => handleWithdraw(stream.paymentId)}
                    disabled={!stream.claimableAmount || stream.claimableAmount === 0n || withdrawing === stream.paymentId}
                  >
                    {withdrawing === stream.paymentId ? "Withdrawing..." : "Withdraw"}
                  </button>
                  {stream.escrowAmount > 0n && (
                    <button className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm transition">
                      View Milestones
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
