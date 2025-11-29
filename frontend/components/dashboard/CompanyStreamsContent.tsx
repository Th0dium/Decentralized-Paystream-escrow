"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import { pauseStream, resumeStream, cancelStream } from "@/lib/contract-interaction";

const ITEMS_PER_PAGE = 10;

export default function CompanyStreamsContent() {
  const { walletAddress, isCompany } = useAuth();
  const { asCompany: streams, isLoading: loading, error, refetch } = useMyPayments(walletAddress as any);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionStreamId, setActionStreamId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<
    "pause" | "resume" | "cancel" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Client-side pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedStreams = streams.slice(startIdx, endIdx);
  const totalPages = Math.ceil(streams.length / ITEMS_PER_PAGE);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleStreamAction = async (
    streamId: number,
    type: "pause" | "resume" | "cancel"
  ) => {
    setActionStreamId(streamId);
    setActionType(type);
    setActionError(null);
    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      const streamIdStr = streamId.toString();

      switch (type) {
        case "pause":
          await pauseStream(contractAddress as any, streamIdStr);
          break;
        case "resume":
          await resumeStream(contractAddress as any, streamIdStr);
          break;
        case "cancel":
          await cancelStream(contractAddress as any, streamIdStr);
          break;
      }

      // Refetch after action
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
      setActionStreamId(null);
      setActionType(null);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Manage Salary Streams</h1>
        <Button
          onClick={handleRefresh}
          variant="secondary"
        >
          Refresh
        </Button>
      </div>

      {!isCompany && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have a company role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {actionError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
          <p className="text-sm text-red-300">{actionError}</p>
        </div>
      )}

      {streams.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            You have not created any streams yet.
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
                      Employee: {stream.employee.slice(0, 6)}...
                      {stream.employee.slice(-4)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${stream.cancelled
                        ? "bg-red-900/30 text-red-300"
                        : stream.paused
                          ? "bg-yellow-900/30 text-yellow-300"
                          : "bg-green-900/30 text-green-300"
                      }`}
                  >
                    {stream.cancelled
                      ? "Cancelled"
                      : stream.paused
                        ? "Paused"
                        : "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-slate-400">Stream Amount</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {formatUnits(stream.streamAmount, stream.tokenDecimals)} {stream.tokenSymbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Escrow Amount</div>
                    <div className="text-lg font-semibold text-purple-400">
                      {formatUnits(stream.escrowAmount, stream.tokenDecimals)} {stream.tokenSymbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Withdrawn</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {formatUnits(stream.withdrawn, stream.tokenDecimals)} {stream.tokenSymbol}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Progress</div>
                    <div className="text-lg font-semibold text-blue-400">{stream.progress}%</div>
                  </div>
                </div>

                <div className="text-sm text-slate-400 mb-6">
                  <p>Start: {new Date(Number(stream.startTime) * 1000).toLocaleDateString()}</p>
                  <p>End: {new Date(Number(stream.stopTime) * 1000).toLocaleDateString()}</p>
                </div>

                {!stream.cancelled && (
                  <div className="flex gap-3 flex-wrap">
                    {!stream.paused ? (
                      <Button
                        onClick={() =>
                          handleStreamAction(stream.paymentId, "pause")
                        }
                        variant="secondary"
                        loading={
                          actionStreamId === stream.paymentId &&
                          actionType === "pause" &&
                          isSubmitting
                        }
                      >
                        Pause Stream
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          handleStreamAction(stream.paymentId, "resume")
                        }
                        variant="success"
                        loading={
                          actionStreamId === stream.paymentId &&
                          actionType === "resume" &&
                          isSubmitting
                        }
                      >
                        Resume Stream
                      </Button>
                    )}
                    <Button
                      onClick={() =>
                        handleStreamAction(stream.paymentId, "cancel")
                      }
                      variant="danger"
                      loading={
                        actionStreamId === stream.paymentId &&
                        actionType === "cancel" &&
                        isSubmitting
                      }
                    >
                      Cancel Stream
                    </Button>
                  </div>
                )}
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