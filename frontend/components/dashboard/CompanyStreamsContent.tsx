"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments, EnrichedPayment } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import { pausePayment, resumePayment, cancelPayment } from "@/lib/contract-interaction";
import { useDashboardStore } from "@/lib/dashboard-store";
import PaymentDetailsModal from "@/components/PaymentDetailsModal";

const ITEMS_PER_PAGE = 10;

export default function CompanyStreamsContent() {
  const { walletAddress, isCompany } = useAuth();
  const { asCompany: payments, isLoading: loading, error, refetch } = useMyPayments(walletAddress as any);
  const { setActiveDashboardView } = useDashboardStore();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal State
  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Client-side pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedPayments = payments.slice(startIdx, endIdx);
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);

  const handleRefresh = async () => {
    await refetch();
  };

  const handlePaymentAction = async (
    paymentId: number,
    type: "pause" | "resume" | "cancel" | "withdraw"
  ) => {
    if (type === "withdraw") return; // Company cannot withdraw
    
    setActionError(null);
    setIsSubmitting(true);

    try {
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      const paymentIdStr = paymentId.toString();

      switch (type) {
        case "pause":
          await pausePayment(contractAddress as any, paymentIdStr);
          break;
        case "resume":
          await resumePayment(contractAddress as any, paymentIdStr);
          break;
        case "cancel":
          await cancelPayment(contractAddress as any, paymentIdStr);
          break;
      }

      // Refetch after action and close modal
      await refetch();
      setSelectedPayment(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading payments...</div>
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
        <h1 className="text-3xl font-bold text-slate-100">Manage Salary Payments</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveDashboardView('company-create-payment')}
            variant="primary"
          >
            Create New Payment
          </Button>
          <Button
            onClick={handleRefresh}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
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

      {payments.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            You have not created any payments yet.
          </p>
        </Card>
      ) : (
        <>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Payment</th>
                      <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Status</th>
                      <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Amounts (Stream / Escrow)</th>
                      <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {paginatedPayments.map((payment) => (
                      <tr 
                        key={payment.paymentId} 
                        className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <td className="p-4 text-slate-100">
                          <div className="font-semibold">{payment.name}</div>
                          <div className="text-xs text-slate-500">#{payment.paymentId}</div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${payment.cancelled
                                ? "bg-red-900/30 text-red-300"
                                : payment.paused
                                  ? "bg-yellow-900/30 text-yellow-300"
                                  : "bg-green-900/30 text-green-300"
                              }`}
                          >
                            {payment.cancelled
                              ? "Cancelled"
                              : payment.paused
                                ? "Paused"
                                : "Active"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-100">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{formatUnits(payment.streamAmount, payment.tokenDecimals)} {payment.tokenSymbol} (Stream)</span>
                            <span className="text-xs text-purple-400">{formatUnits(payment.escrowAmount, payment.tokenDecimals)} {payment.tokenSymbol} (Escrow)</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="w-full bg-slate-700 rounded-full h-2.5 mb-1 min-w-[100px] max-w-[200px]">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${payment.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400">{payment.progress}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
      
      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={!!selectedPayment}
        closeModal={() => setSelectedPayment(null)}
        payment={selectedPayment}
        onAction={handlePaymentAction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}