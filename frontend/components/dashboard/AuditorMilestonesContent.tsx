"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyMilestones, MilestoneStatus } from "@/lib/hooks/useMyMilestones";
import { formatUnits } from "viem";
import { approveMilestone, rejectMilestone } from "@/lib/contract-interaction";

export default function AuditorMilestonesContent() {
  const { walletAddress } = useAuth();
  const { milestones, isLoading, error, refetch } = useMyMilestones(walletAddress as any, "auditor");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter milestones based on tab
  const filteredMilestones = milestones.filter((m) => {
    if (activeTab === "pending") return m.status === MilestoneStatus.PENDING;
    return m.status !== MilestoneStatus.PENDING;
  });

  const handleAction = async (id: number, type: "approve" | "reject") => {
    setActionId(id);
    setActionType(type);
    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      if (type === "approve") {
        await approveMilestone(contractAddress as any, id.toString());
      } else {
        await rejectMilestone(contractAddress as any, id.toString());
      }
      await refetch();
    } catch (err) {
      console.error("Action failed:", err);
      alert("Action failed. Check console for details.");
    } finally {
      setIsSubmitting(false);
      setActionId(null);
      setActionType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading milestones...</div>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Milestone Reviews</h1>
        <Button onClick={() => refetch()} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-slate-700 pb-1">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "pending"
              ? "bg-slate-800 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Reviews ({milestones.filter(m => m.status === MilestoneStatus.PENDING).length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "history"
              ? "bg-slate-800 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {/* Content */}
      {filteredMilestones.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            {activeTab === "pending"
              ? "No pending milestones to review."
              : "No milestone history found."}
          </p>
        </Card>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">ID</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Payment ID</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Amount</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Status</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Date</th>
                    {activeTab === "pending" && (
                      <th className="p-4 text-slate-400 font-medium border-b border-slate-700 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredMilestones.map((milestone) => (
                    <tr key={milestone.milestoneId} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-4 text-slate-100 font-mono">#{milestone.milestoneId}</td>
                      <td className="p-4 text-slate-300 font-mono">Payment #{milestone.paymentId}</td>
                      <td className="p-4 text-slate-100 font-semibold">
                        {formatUnits(milestone.amount, milestone.tokenDecimals)} {milestone.tokenSymbol}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            milestone.status === MilestoneStatus.PENDING
                              ? "bg-yellow-900/30 text-yellow-300"
                              : milestone.status === MilestoneStatus.APPROVED
                              ? "bg-green-900/30 text-green-300"
                              : milestone.status === MilestoneStatus.REJECTED
                              ? "bg-red-900/30 text-red-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {MilestoneStatus[milestone.status]}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {new Date(milestone.createdAt * 1000).toLocaleDateString()}
                      </td>
                      {activeTab === "pending" && (
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleAction(milestone.milestoneId, "approve")}
                              variant="success"
                              className="text-xs py-1 px-3 h-auto"
                              loading={actionId === milestone.milestoneId && actionType === "approve" && isSubmitting}
                              disabled={isSubmitting}
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleAction(milestone.milestoneId, "reject")}
                              variant="danger"
                              className="text-xs py-1 px-3 h-auto"
                              loading={actionId === milestone.milestoneId && actionType === "reject" && isSubmitting}
                              disabled={isSubmitting}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}