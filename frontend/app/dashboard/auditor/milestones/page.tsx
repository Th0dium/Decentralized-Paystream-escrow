"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth, usePendingMilestones } from "@/lib/hooks";
import { MilestoneStatus } from "@/lib/types";

export default function AuditorMilestonesPage() {
  const { isAuditor } = useAuth();
  const { milestones, loading, refetch } = usePendingMilestones();
  const [selectedMilestoneId] = useState<number | null>(
    null
  );
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(
    null
  );

  const handleReviewMilestone = async (
    milestoneId: number,
    action: "approve" | "reject"
  ) => {
    setReviewingId(milestoneId);
    setReviewAction(action);

    try {
      // TODO: Call smart contract approve/reject function
      console.log(`${action}ing milestone ${milestoneId}`);
      await refetch();
    } catch (error) {
      console.error(`Failed to ${action} milestone:`, error);
    } finally {
      setReviewingId(null);
      setReviewAction(null);
    }
  };

  const pendingMilestones = milestones.filter(
    (m) => m.status === MilestoneStatus.PENDING
  );
  const reviewedMilestones = milestones.filter(
    (m) => m.status !== MilestoneStatus.PENDING
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">Review Milestones</h1>

      {!isAuditor && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have an auditor role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {/* Pending Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-slate-100">
          Pending Review ({pendingMilestones.length})
        </h2>

        {pendingMilestones.length === 0 ? (
          <Card>
            <p className="text-center text-slate-400 py-8">
              No pending milestones to review.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingMilestones.map((milestone) => (
              <Card
                key={milestone.milestoneId}
                className={
                  selectedMilestoneId === milestone.milestoneId
                    ? "border-blue-500 border-2"
                    : ""
                }
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      Milestone #{milestone.milestoneId}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Stream #{milestone.streamId} • Submitter:{" "}
                      {milestone.submitter.slice(0, 6)}...
                      {milestone.submitter.slice(-4)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-900/30 text-yellow-300">
                    {milestone.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-slate-400">Amount</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {(
                        BigInt(milestone.amount) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Submitted</div>
                    <div className="text-sm font-semibold text-slate-100">
                      {new Date(
                        milestone.createdAt * 1000
                      ).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {milestone.ipfsHash && (
                  <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="text-sm font-semibold mb-2 text-slate-100">Evidence (IPFS)</p>
                    <p className="text-xs font-mono break-all text-slate-400">
                      {milestone.ipfsHash}
                    </p>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${milestone.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-blue-400 hover:underline"
                    >
                      View on IPFS →
                    </a>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() =>
                      handleReviewMilestone(
                        milestone.milestoneId,
                        "approve"
                      )
                    }
                    variant="success"
                    loading={
                      reviewingId === milestone.milestoneId &&
                      reviewAction === "approve"
                    }
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() =>
                      handleReviewMilestone(
                        milestone.milestoneId,
                        "reject"
                      )
                    }
                    variant="danger"
                    loading={
                      reviewingId === milestone.milestoneId &&
                      reviewAction === "reject"
                    }
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Section */}
      {reviewedMilestones.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-slate-100">
            Review History ({reviewedMilestones.length})
          </h2>

          <div className="grid gap-6">
            {reviewedMilestones.map((milestone) => (
              <Card key={milestone.milestoneId} className="opacity-75">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      Milestone #{milestone.milestoneId}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Stream #{milestone.streamId} • Submitter:{" "}
                      {milestone.submitter.slice(0, 6)}...
                      {milestone.submitter.slice(-4)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      milestone.status === MilestoneStatus.APPROVED
                        ? "bg-green-900/30 text-green-300"
                        : "bg-red-900/30 text-red-300"
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Amount</p>
                    <p className="font-semibold text-slate-100">
                      {(
                        BigInt(milestone.amount) / BigInt(10 ** 18)
                      ).toString()}{" "}
                      tokens
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Submitted</p>
                    <p className="font-semibold text-slate-100">
                      {new Date(
                        milestone.createdAt * 1000
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {milestone.approvedAt && (
                    <div>
                      <p className="text-slate-400">Reviewed</p>
                      <p className="font-semibold text-slate-100">
                        {new Date(
                          milestone.approvedAt * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
