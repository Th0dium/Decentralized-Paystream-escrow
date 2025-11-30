"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/hooks";
import { useMyPayments, EnrichedPayment } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import PaymentDetailsModal from "@/components/PaymentDetailsModal";

export default function AuditorPaymentsContent() {
  const { walletAddress } = useAuth();
  const { asAuditor: payments, isLoading: loading, error, refetch } = useMyPayments(walletAddress as any);

  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openDetailsModal = (payment: EnrichedPayment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setSelectedPayment(null);
    setIsModalOpen(false);
  };

  // Filter payments with escrow only (auditor role only matters for escrow)
  const paymentsWithEscrow = payments.filter(p => p.escrowAmount > 0n);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Auditor Dashboard</h1>
          <p className="text-slate-400 mt-2">Review and monitor payments where you are assigned as auditor</p>
        </div>
        <Button onClick={() => refetch()} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-sm text-slate-400">Total Payments</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{paymentsWithEscrow.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Active Payments</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {paymentsWithEscrow.filter(p => p.isActive).length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Total Escrow Value</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {paymentsWithEscrow.reduce((sum, p) => {
              // Simple sum in first token's units (ideally would convert to USD)
              if (p.tokenSymbol === paymentsWithEscrow[0]?.tokenSymbol) {
                return sum + Number(formatUnits(p.escrowAmount, p.tokenDecimals));
              }
              return sum;
            }, 0).toFixed(2)} {paymentsWithEscrow[0]?.tokenSymbol || 'Tokens'}
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      {paymentsWithEscrow.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-2">No payments assigned</div>
            <p className="text-slate-500 text-sm">
              You are not currently assigned as an auditor for any payments with escrow.
            </p>
          </div>
        </Card>
      ) : (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">ID</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Payment Name</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Company</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Employee</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Escrow Amount</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Status</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700">Progress</th>
                    <th className="p-4 text-slate-400 font-medium border-b border-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {paymentsWithEscrow.map((payment) => (
                    <tr
                      key={payment.paymentId}
                      className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                      onClick={() => openDetailsModal(payment)}
                    >
                      <td className="p-4 text-slate-100 font-mono">#{payment.paymentId}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-100">{payment.name}</div>
                        <div className="text-xs text-slate-500">
                          Stream: {formatUnits(payment.streamAmount, payment.tokenDecimals)} {payment.tokenSymbol}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300 font-mono text-xs">
                          {payment.company.slice(0, 6)}...{payment.company.slice(-4)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300 font-mono text-xs">
                          {payment.employee.slice(0, 6)}...{payment.employee.slice(-4)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-purple-300">
                          {formatUnits(payment.escrowAmount, payment.tokenDecimals)} {payment.tokenSymbol}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.cancelled
                              ? "bg-red-900/30 text-red-300"
                              : payment.paused
                              ? "bg-yellow-900/30 text-yellow-300"
                              : payment.isActive
                              ? "bg-green-900/30 text-green-300"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {payment.cancelled
                            ? "Cancelled"
                            : payment.paused
                            ? "Paused"
                            : payment.isActive
                            ? "Active"
                            : "Completed"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${payment.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 w-10">{payment.progress}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="secondary"
                          className="text-xs py-1 px-3 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsModal(payment);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={isModalOpen}
        closeModal={closeDetailsModal}
        payment={selectedPayment}
        onAction={() => {}} // Auditor doesn't have payment actions, only milestone reviews
        isSubmitting={false}
      />
    </div>
  );
}
