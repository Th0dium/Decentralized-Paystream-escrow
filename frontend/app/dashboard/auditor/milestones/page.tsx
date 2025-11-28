"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import { approveMilestone, rejectMilestone } from "@/lib/contract-interaction";

const ITEMS_PER_PAGE = 10;

export default function AuditorMilestonesPage() {
  const { walletAddress, isAuditor } = useAuth();
  const { asAuditor: auditorStreams, isLoading: loading } = useMyPayments(walletAddress as any);
  const [selectedMilestoneId] = useState<number | null>(null);
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

      // Refetch after action
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error(`Failed to ${action} milestone:`, error);
    } finally {
      setReviewingId(null);
      setReviewAction(null);
    }
  };

  // For now, auditor milestones would be fetched from the auditor streams
  // This is a simplified view - in a full implementation you'd fetch milestone details
  const pendingMilestones: any[] = [];
  const reviewedMilestones: any[] = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading auditor streams...</div>
      </div>
    );
  }

  // Pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedStreams = auditorStreams.slice(startIdx, endIdx);
  const totalPages = Math.ceil(auditorStreams.length / ITEMS_PER_PAGE);

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

      {/* Streams Summary */}
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
                        {formatUnits(stream.escrowAmount, 18)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Stream Amount</div>
                      <div className="text-lg font-semibold text-slate-100">
                        {formatUnits(stream.streamAmount, 18)}
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

      {/* Info Box */}
      <Card>
        <h3 className="text-lg font-semibold mb-2 text-slate-100">About Auditor Role</h3>
        <p className="text-slate-400 text-sm">
          As an auditor, you are assigned to specific streams to review and approve/reject milestones submitted by employees.
          Use the streams listed above to manage your auditing responsibilities. When employees submit milestones, they will appear in the contract for your review.
        </p>
      </Card>
    </div>
  );
}
