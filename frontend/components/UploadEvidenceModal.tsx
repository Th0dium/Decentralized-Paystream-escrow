"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Button";
import { EnrichedPayment } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";

interface UploadEvidenceModalProps {
  isOpen: boolean;
  closeModal: () => void;
  payment: EnrichedPayment | null;
  onUpload: (file: File, milestoneAmount: string) => Promise<void>;
  isUploading: boolean;
}

export default function UploadEvidenceModal({
  isOpen,
  closeModal,
  payment,
  onUpload,
  isUploading,
}: UploadEvidenceModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !milestoneAmount || !payment) return;

    try {
      await onUpload(selectedFile, milestoneAmount);
      // Reset form
      setSelectedFile(null);
      setMilestoneAmount("");
      closeModal();
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMilestoneAmount("");
    closeModal();
  };

  if (!payment) return null;

  const maxAmount = formatUnits(payment.escrowAmount, payment.tokenDecimals);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-bold text-slate-100 mb-2">
                  Upload Evidence
                </Dialog.Title>

                <div className="text-sm text-slate-400 mb-4">
                  Payment: <span className="text-slate-200 font-semibold">{payment.name}</span>
                  <br />
                  ID: <span className="text-slate-300">#{payment.paymentId}</span>
                </div>

                <div className="space-y-4">
                  {/* Milestone Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Milestone Amount ({payment.tokenSymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={maxAmount}
                      placeholder={`Max: ${maxAmount}`}
                      value={milestoneAmount}
                      onChange={(e) => setMilestoneAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Available escrow: {maxAmount} {payment.tokenSymbol}
                    </p>
                  </div>

                  {/* File Upload Area */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Evidence File
                    </label>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-slate-600 bg-slate-900/50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
                      />

                      {selectedFile ? (
                        <div className="space-y-2">
                          <div className="text-4xl">📄</div>
                          <div className="text-sm text-slate-300 font-medium">
                            {selectedFile.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </div>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-4xl">📎</div>
                          <div className="text-sm text-slate-300">
                            <label htmlFor="file-upload" className="cursor-pointer text-blue-400 hover:text-blue-300">
                              Choose a file
                            </label>
                            {" "}or drag and drop
                          </div>
                          <div className="text-xs text-slate-500">
                            PDF, DOC, TXT, Images, ZIP (Max 10MB)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                    <p className="text-xs text-purple-300">
                      <strong>Note:</strong> Your evidence will be:
                      <br />
                      1. Uploaded to IPFS (decentralized storage)
                      <br />
                      2. Encrypted with auditor's public key
                      <br />
                      3. Hash published on-chain for verification
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!selectedFile || !milestoneAmount || isUploading}
                    loading={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? "Uploading..." : "Submit Evidence"}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
