"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, useCompanyStreams } from "@/lib/hooks";

export default function CompanyStreamsPage() {
  const { walletAddress, isCompany } = useAuth();
  const { streams, loading, error, refetch } = useCompanyStreams(walletAddress);
  const [isRefetching, setIsRefetching] = useState(false);
  const [actionStreamId, setActionStreamId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<
    "pause" | "resume" | "cancel" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } finally {
      setIsRefetching(false);
    }
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
      // TODO: Call smart contract functions
      console.log(`Performing ${type} action on stream ${streamId}`);
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
          loading={isRefetching}
        >
          Refresh
        </Button>
      </div>

      {!isCompany && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don't have a company role. Data shown below is for viewing only.
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
        <div className="grid gap-6">
          {streams.map((stream) => (
            <Card key={stream.streamId}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Stream #{stream.streamId}
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
                  <div className="text-sm text-slate-400">Total Amount</div>
                  <div className="text-lg font-semibold text-slate-100">
                    {(BigInt(stream.totalAmount) / BigInt(10 ** 18)).toString()}{" "}
                    Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Withdrawn</div>
                  <div className="text-lg font-semibold text-slate-100">
                    {(BigInt(stream.withdrawn) / BigInt(10 ** 18)).toString()}{" "}
                    Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Escrowed</div>
                  <div className="text-lg font-semibold text-purple-400">
                    {(BigInt(stream.escrowed) / BigInt(10 ** 18)).toString()}{" "}
                    Tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Remaining</div>
                  <div className="text-lg font-semibold text-blue-400">
                    {(
                      BigInt(stream.totalAmount) -
                      BigInt(stream.withdrawn) -
                      BigInt(stream.escrowed)
                    )
                      .toString()
                      .padStart(18, "0")}
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-400 mb-6">
                <p>Start: {new Date(stream.startTime * 1000).toLocaleDateString()}</p>
                <p>End: {new Date(stream.stopTime * 1000).toLocaleDateString()}</p>
              </div>

              {!stream.cancelled && (
                <div className="flex gap-3 flex-wrap">
                  {!stream.paused ? (
                    <Button
                      onClick={() =>
                        handleStreamAction(stream.streamId, "pause")
                      }
                      variant="secondary"
                      loading={
                        actionStreamId === stream.streamId &&
                        actionType === "pause" &&
                        isSubmitting
                      }
                    >
                      Pause Stream
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        handleStreamAction(stream.streamId, "resume")
                      }
                      variant="success"
                      loading={
                        actionStreamId === stream.streamId &&
                        actionType === "resume" &&
                        isSubmitting
                      }
                    >
                      Resume Stream
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      handleStreamAction(stream.streamId, "cancel")
                    }
                    variant="danger"
                    loading={
                      actionStreamId === stream.streamId &&
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
      )}
    </div>
  );
}
