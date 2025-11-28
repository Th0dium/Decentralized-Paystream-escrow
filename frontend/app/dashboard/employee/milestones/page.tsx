"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyMilestones, MilestoneStatus } from "@/lib/hooks/useMyMilestones";
import { claimMilestone } from "@/lib/contract-interaction";
import { formatUnits } from "viem";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export default function MilestonesPage() {
  const { walletAddress, isEmployee } = useAuth();
  const { milestones, isLoading } = useMyMilestones(walletAddress as any, 'employee');
  const [isClaimingId, setIsClaimingId] = useState<number | null>(null);

  const handleClaimMilestone = async (milestoneId: number) => {
    setIsClaimingId(milestoneId);

    try {
      if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured");
      
      await claimMilestone(CONTRACT_ADDRESS as any, milestoneId.toString());
      
      // Auto-refresh handled by hook or page reload
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Failed to claim milestone:", error);
      alert("Failed to claim: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsClaimingId(null);
    }
  };

  const getStatusLabel = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING: return "Pending";
      case MilestoneStatus.APPROVED: return "Approved";
      case MilestoneStatus.REJECTED: return "Rejected";
      case MilestoneStatus.CLAIMED: return "Claimed";
      default: return "Unknown";
    }
  };

  const getStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case MilestoneStatus.PENDING:
        return "bg-yellow-900/30 text-yellow-300";
      case MilestoneStatus.APPROVED:
        return "bg-green-900/30 text-green-300";
      case MilestoneStatus.CLAIMED:
        return "bg-blue-900/30 text-blue-300";
      case MilestoneStatus.REJECTED:
        return "bg-red-900/30 text-red-300";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-100">My Milestones</h1>

      {!isEmployee && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have an employee role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {milestones.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            You have no milestones yet. Submit a milestone to unlock escrowed
            funds.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {milestones.map((milestone) => (
            <Card key={milestone.milestoneId}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    Milestone #{milestone.milestoneId}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Stream #{milestone.streamId}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    milestone.status
                  )}`}
                >
                  {getStatusLabel(milestone.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate-400">Amount</div>
                  <div className="text-lg font-semibold text-slate-100">
                    {formatUnits(milestone.amount, 18)} tokens
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Submitted</div>
                  <div className="text-sm font-semibold text-slate-100">
                    {new Date(milestone.createdAt * 1000).toLocaleDateString()}
                  </div>
                </div>
                {milestone.approvedAt > 0 && (
                  <div>
                    <div className="text-sm text-slate-400">Approved</div>
                    <div className="text-sm font-semibold text-slate-100">
                      {new Date(
                        milestone.approvedAt * 1000
                      ).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {milestone.status === MilestoneStatus.APPROVED &&
                (isClaimingId === milestone.milestoneId ? (
                  <Button className="w-full" disabled>Processing...</Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() =>
                      handleClaimMilestone(milestone.milestoneId)
                    }
                    variant="success"
                  >
                    Claim Funds
                  </Button>
                ))}

              {milestone.status === MilestoneStatus.REJECTED && (
                <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                  <p className="text-sm text-red-300">
                    This milestone was rejected. Funds will be available for
                    future submission.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
