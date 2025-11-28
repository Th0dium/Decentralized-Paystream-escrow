"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments } from "@/lib/hooks/useMyPayments";
import { useMyMilestones, MilestoneStatus } from "@/lib/hooks/useMyMilestones";
import { formatUnits } from "viem";
import { approveMilestone, rejectMilestone } from "@/lib/contract-interaction";

const ITEMS_PER_PAGE = 10;

export default function AuditorMilestonesPage() {
  const { walletAddress, isAuditor } = useAuth();
  const { asAuditor: auditorStreams, isLoading: streamsLoading, refetch: refetchStreams } = useMyPayments(walletAddress as any);
  const { milestones, isLoading: milestonesLoading, refetch: refetchMilestones } = useMyMilestones(walletAddress as any, 'auditor');
  
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleReviewMilestone = async (
    milestoneId: number,
    action: "approve" | "reject"
  ) => {
    setReviewingId(milestoneId);
    setReviewAction(action);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      const milestoneIdStr = milestoneId.toString();

      if (action === "approve") {
        await approveMilestone(contractAddress as any, milestoneIdStr);
      } else {
        await rejectMilestone(contractAddress as any, milestoneIdStr);
      }

      // Refetch or reload
      await Promise.all([refetchStreams(), refetchMilestones()]);
    } catch (error) {
      console.error(`Failed to ${action} milestone:`, error);
      alert(`Failed to ${action}: ` + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setReviewingId(null);
      setReviewAction(null);
    }
  };

  // Filter Pending Milestones
  const pendingMilestones = milestones.filter(m => m.status === MilestoneStatus.PENDING);

  // Pagination for Streams
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedStreams = auditorStreams.slice(startIdx, endIdx);
  const totalPages = Math.ceil(auditorStreams.length / ITEMS_PER_PAGE);

  if (streamsLoading || milestonesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading auditor dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Auditor Dashboard</h1>

      {!isAuditor && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have an auditor role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {/* PENDING MILESTONES SECTION */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-slate-100">
          Pending Approvals ({pendingMilestones.length})
        </h2>

        {pendingMilestones.length === 0 ? (
            <Card>
                <p className="text-center text-slate-400 py-8">
                    No pending milestones to review.
                </p>
            </Card>
        ) : (
            <div className="space-y-4">
                {pendingMilestones.map((milestone) => (
                    <Card key={milestone.milestoneId}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-100">
                                    Milestone #{milestone.milestoneId}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Stream #{milestone.streamId} • Submitter: {milestone.submitter.slice(0,6)}...{milestone.submitter.slice(-4)}
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900/30 text-yellow-300">
                                Pending Review
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <div className="text-sm text-slate-400">Amount Requested</div>
                                <div className="text-lg font-semibold text-slate-100">
                                    {formatUnits(milestone.amount, milestone.tokenDecimals)} {milestone.tokenSymbol}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-400">Submitted Date</div>
                                <div className="text-sm font-semibold text-slate-100">
                                    {new Date(milestone.createdAt * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                             <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                disabled={reviewingId === milestone.milestoneId}
                                onClick={() => handleReviewMilestone(milestone.milestoneId, "approve")}
                             >
                                {reviewingId === milestone.milestoneId && reviewAction === "approve" ? "Approving..." : "Approve"}
                             </Button>
                             <Button 
                                className="flex-1 bg-red-600 hover:bg-red-700"
                                disabled={reviewingId === milestone.milestoneId}
                                onClick={() => handleReviewMilestone(milestone.milestoneId, "reject")}
                             >
                                {reviewingId === milestone.milestoneId && reviewAction === "reject" ? "Rejecting..." : "Reject"}
                             </Button>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {/* STREAMS SUMMARY */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-slate-100">
          Assigned Streams ({auditorStreams.length})
        </h2>

        {auditorStreams.length === 0 ? (
          <Card>
            <p className="text-center text-slate-400 py-8">
              No streams assigned to you as auditor yet.
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
                        Employee: {stream.employee.slice(0, 6)}...{stream.employee.slice(-4)}
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
                      <div className="text-sm text-slate-400">Escrow Amount</div>
                      <div className="text-lg font-semibold text-purple-400">
                        {formatUnits(stream.escrowAmount, stream.tokenDecimals)} {stream.tokenSymbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Stream Amount</div>
                      <div className="text-lg font-semibold text-slate-100">
                        {formatUnits(stream.streamAmount, stream.tokenDecimals)} {stream.tokenSymbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Progress</div>
                      <div className="text-lg font-semibold text-blue-400">{stream.progress}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Status</div>
                      <div className="text-lg font-semibold text-slate-100">
                        {stream.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">
                    End Date: {new Date(Number(stream.stopTime) * 1000).toLocaleDateString()}
                  </p>
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
    </div>
  );
}
