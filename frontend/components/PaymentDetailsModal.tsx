import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Button";
import { formatUnits } from "viem";
import { EnrichedPayment } from "@/lib/hooks/useMyPayments";

interface PaymentDetailsModalProps {
  isOpen: boolean;
  closeModal: () => void;
  payment: EnrichedPayment | null;
  onAction: (paymentId: number, action: "pause" | "resume" | "cancel" | "withdraw") => void;
  isSubmitting: boolean;
  actionLabel?: string; // specific label for the current action if any
}

export default function PaymentDetailsModal({
  isOpen,
  closeModal,
  payment,
  onAction,
  isSubmitting,
}: PaymentDetailsModalProps) {
  if (!payment) return null;

  const isCompany = payment.userRole === "company";
  const isEmployee = payment.userRole === "employee";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-fit max-w-screen-lg transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-white mb-2"
                >
                  {payment.name}
                </Dialog.Title>
                <div className="text-sm text-slate-400 mb-6 flex gap-4">
                  <span>ID: #{payment.paymentId}</span>
                  <span>
                    Status:{" "}
                    <span
                      className={`font-medium ${
                        payment.cancelled
                          ? "text-red-400"
                          : payment.paused
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {payment.cancelled
                        ? "Cancelled"
                        : payment.paused
                        ? "Paused"
                        : "Active"}
                    </span>
                  </span>
                </div>

                {/* Detailed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Amounts Card */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">
                      Financials
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stream Amount:</span>
                        <span className="text-slate-200">
                          {formatUnits(payment.streamAmount, payment.tokenDecimals)}{" "}
                          {payment.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Escrow Amount:</span>
                        <span className="text-purple-300">
                          {formatUnits(payment.escrowAmount, payment.tokenDecimals)}{" "}
                          {payment.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                        <span className="text-slate-400">Withdrawn:</span>
                        <span className="text-slate-200">
                          {formatUnits(payment.withdrawn, payment.tokenDecimals)}{" "}
                          {payment.tokenSymbol}
                        </span>
                      </div>
                      {isEmployee && payment.claimableAmount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Claimable:</span>
                          <span className="text-green-400 font-bold">
                            {formatUnits(
                              payment.claimableAmount,
                              payment.tokenDecimals
                            )}{" "}
                            {payment.tokenSymbol}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timing & Progress Card */}
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">
                      Timeline & Parties
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Start Date:</span>
                        <span className="text-slate-200">
                          {new Date(
                            Number(payment.startTime) * 1000
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">End Date:</span>
                        <span className="text-slate-200">
                          {new Date(
                            Number(payment.stopTime) * 1000
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                         <span className="text-slate-400">
                          {isCompany ? "Employee:" : "Company:"}
                        </span>
                        <span className="text-slate-200 font-mono text-xs">
                           {isCompany ? payment.employee : payment.company}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{payment.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${payment.progress}%` }}
                            ></div>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-6">
                  <Button variant="secondary" onClick={closeModal}>
                    Close
                  </Button>
                  
                  {isCompany && !payment.cancelled && (
                    <>
                      {!payment.paused ? (
                        <Button
                          variant="secondary"
                          onClick={() => onAction(payment.paymentId, "pause")}
                          loading={isSubmitting}
                          disabled={isSubmitting}
                        >
                          Pause Stream
                        </Button>
                      ) : (
                        <Button
                          variant="success"
                          onClick={() => onAction(payment.paymentId, "resume")}
                          loading={isSubmitting}
                          disabled={isSubmitting}
                        >
                          Resume Stream
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        onClick={() => onAction(payment.paymentId, "cancel")}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                      >
                        Cancel Payment
                      </Button>
                    </>
                  )}

                  {isEmployee && (
                     <Button
                        variant="primary"
                        onClick={() => onAction(payment.paymentId, "withdraw")}
                        loading={isSubmitting}
                        disabled={isSubmitting || !payment.claimableAmount || payment.claimableAmount <= 0n}
                      >
                        Withdraw
                      </Button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
