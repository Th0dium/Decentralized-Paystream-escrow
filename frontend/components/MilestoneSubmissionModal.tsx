"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Button";
import { ipfsService } from "@/lib/ipfs-service";
import { submitMilestone } from "@/lib/contract-interaction";

interface MilestoneSubmissionModalProps {
  isOpen: boolean;
  closeModal: () => void;
  paymentId: number;
  tokenSymbol: string;
  tokenDecimals: number;
  onSuccess: () => void;
}

export default function MilestoneSubmissionModal({
  isOpen,
  closeModal,
  paymentId,
  tokenSymbol,
  tokenDecimals,
  onSuccess,
}: MilestoneSubmissionModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!amount || !description) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload Evidence to IPFS
      const evidenceData = {
        description,
        timestamp: Date.now(),
        files: [], // Placeholder for file uploads if added later
      };
      
      const evidenceCid = await ipfsService.uploadJSON(evidenceData);
      console.log("Evidence uploaded to IPFS:", evidenceCid);

      // 2. Submit to Blockchain
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      await submitMilestone(
        contractAddress as any,
        paymentId.toString(),
        amount,
        evidenceCid,
        tokenDecimals
      );

      onSuccess();
      closeModal();
    } catch (err) {
      console.error("Submission failed:", err);
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-white mb-4"
                >
                  Request Milestone Release
                </Dialog.Title>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Amount to Release ({tokenSymbol})
                    </label>
                    <input
                      type="number"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Evidence / Description
                    </label>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      placeholder="Describe the work completed... (e.g., GitHub PR link, Drive folder)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/30 border border-red-800/50 rounded text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
