"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/Button";
import { EnrichedMilestone, MilestoneStatus } from "@/lib/hooks/useMyMilestones";
import { formatUnits } from "viem";
import { deserializeEncryptedData, decryptWithSecretKey } from "@/lib/encryption";
import { getIPFSUrl } from "@/lib/ipfs";

interface MilestoneEvidenceModalProps {
  isOpen: boolean;
  closeModal: () => void;
  milestone: EnrichedMilestone | null;
  onApprove: (milestoneId: number) => Promise<void>;
  onReject: (milestoneId: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function MilestoneEvidenceModal({
  isOpen,
  closeModal,
  milestone,
  onApprove,
  onReject,
  isSubmitting,
}: MilestoneEvidenceModalProps) {
  const [auditorSecretKey, setAuditorSecretKey] = useState("");
  const [decryptedIPFSHash, setDecryptedIPFSHash] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const handleDecrypt = async () => {
    if (!milestone || !auditorSecretKey || !milestone.encryptedEvidenceHash) {
      setDecryptError("Missing required data");
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      // Deserialize the encrypted data
      const encryptedData = deserializeEncryptedData(
        milestone.encryptedEvidenceHash
      );

      // Decrypt using the secret key
      // The ephemeral public key is now extracted from encryptedData internally
      const ipfsHash = decryptWithSecretKey(
        encryptedData,
        auditorSecretKey
      );

      setDecryptedIPFSHash(ipfsHash);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Decryption failed";
      setDecryptError(errorMsg);
      console.error("❌ Decryption error:", error);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleApprove = async () => {
    if (!milestone) return;
    setActionType("approve");
    try {
      await onApprove(milestone.milestoneId);
      closeModal();
    } finally {
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!milestone) return;
    setActionType("reject");
    try {
      await onReject(milestone.milestoneId);
      closeModal();
    } finally {
      setActionType(null);
    }
  };

  const handleClose = () => {
    setAuditorSecretKey("");
    setDecryptedIPFSHash(null);
    setDecryptError(null);
    setActionType(null);
    closeModal();
  };

  if (!milestone) return null;

  const ipfsUrl = decryptedIPFSHash ? getIPFSUrl(decryptedIPFSHash) : null;
  const isPending = milestone.status === MilestoneStatus.PENDING;

  // Detect if evidence is encrypted (JSON format) or plain text (IPFS Hash)
  const isEncrypted = milestone.encryptedEvidenceHash.trim().startsWith("{");
  // If not encrypted, the "encryptedEvidenceHash" field actually holds the plain IPFS hash
  const plainIpfsHash = !isEncrypted ? milestone.encryptedEvidenceHash : null;
  const plainIpfsUrl = plainIpfsHash ? getIPFSUrl(plainIpfsHash) : null;

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-xl font-bold text-slate-100 mb-2">
                  Milestone Evidence Review
                </Dialog.Title>

                <div className="text-sm text-slate-400 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-semibold text-slate-200">
                        {milestone.paymentName}
                      </span>
                      <br />
                      <span className="text-xs text-slate-500">
                        Milestone #{milestone.milestoneId}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Amount Requested */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">
                      Amount Requested
                    </h4>
                    <div className="text-2xl font-bold text-blue-400">
                      {formatUnits(milestone.amount, milestone.tokenDecimals)}{" "}
                      <span className="text-lg text-slate-400">
                        {milestone.tokenSymbol}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Section */}
                  {milestone.encryptedEvidenceHash ? (
                    <div className="space-y-4">
                      {isEncrypted ? (
                        /* --- ENCRYPTED VIEW --- */
                        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-3">
                            🔐 Encrypted Evidence
                            </h4>
                            <p className="text-xs text-slate-400 mb-3">
                            The employee submitted encrypted evidence. To view it, please enter the Auditor Private Key that was shared with you by the Company (the payment creator).
                            </p>

                            {!decryptedIPFSHash && (
                            <div className="space-y-3">
                                <div>
                                <label className="block text-xs font-medium text-slate-300 mb-2">
                                    Auditor Private Key (Secret)
                                </label>
                                <textarea
                                    value={auditorSecretKey}
                                    onChange={(e) => {
                                    setAuditorSecretKey(e.target.value);
                                    setDecryptError(null);
                                    }}
                                    placeholder="Paste the Auditor Private Key here..."
                                    className="w-full h-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                </div>

                                {decryptError && (
                                <div className="text-xs text-red-400 bg-red-900/20 border border-red-700/50 rounded p-2">
                                    ❌ {decryptError}
                                </div>
                                )}

                                <Button
                                onClick={handleDecrypt}
                                variant="primary"
                                disabled={!auditorSecretKey || isDecrypting}
                                loading={isDecrypting}
                                className="w-full text-sm"
                                >
                                {isDecrypting ? "Decrypting..." : "🔓 Decrypt Evidence"}
                                </Button>
                            </div>
                            )}

                            {decryptedIPFSHash && (
                            <div className="space-y-3">
                                <div className="bg-slate-900 border border-slate-600 rounded-lg p-3">
                                <div className="text-xs text-slate-400 mb-2">
                                    Decrypted IPFS Hash
                                </div>
                                <div className="text-sm font-mono text-slate-300 break-all">
                                    {decryptedIPFSHash}
                                </div>
                                </div>

                                <div className="flex gap-2">
                                <a
                                    href={ipfsUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-slate-700 text-slate-200 hover:bg-slate-600"
                                >
                                    📎 View on IPFS
                                </a>
                                <Button
                                    onClick={() => {
                                    setDecryptedIPFSHash(null);
                                    setAuditorSecretKey("");
                                    }}
                                    variant="secondary"
                                    className="flex-1 text-sm"
                                >
                                    🔐 Hide
                                </Button>
                                </div>
                            </div>
                            )}
                        </div>
                      ) : (
                        /* --- PLAIN / PUBLIC VIEW --- */
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-3">
                            🌐 Public Evidence
                            </h4>
                            <p className="text-xs text-slate-400 mb-3">
                            This evidence was submitted without encryption. It is publicly accessible.
                            </p>

                            <div className="space-y-3">
                                <div className="bg-slate-900 border border-slate-600 rounded-lg p-3">
                                <div className="text-xs text-slate-400 mb-2">
                                    IPFS Hash
                                </div>
                                <div className="text-sm font-mono text-slate-300 break-all">
                                    {plainIpfsHash}
                                </div>
                                </div>

                                <div className="flex gap-2">
                                <a
                                    href={plainIpfsUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-blue-700 text-slate-100 hover:bg-blue-600"
                                >
                                    📎 View on IPFS
                                </a>
                                </div>
                            </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-600 rounded-lg p-4 text-center">
                      <p className="text-sm text-slate-400">
                        📋 No evidence file submitted with this milestone
                      </p>
                    </div>
                  )}

                  {/* Submission Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-slate-400 mb-1">Submitted By</div>
                      <div className="text-slate-200 font-mono break-all">
                        {milestone.submitter.slice(0, 6)}...
                        {milestone.submitter.slice(-4)}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-slate-400 mb-1">Submitted On</div>
                      <div className="text-slate-200">
                        {new Date(milestone.createdAt * 1000).toLocaleDateString()}{" "}
                        {new Date(milestone.createdAt * 1000).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {isPending && (
                    <>
                      <Button
                        variant="danger"
                        onClick={handleReject}
                        disabled={isSubmitting}
                        loading={actionType === "reject" && isSubmitting}
                        className="flex-1"
                      >
                        ❌ Reject
                      </Button>
                      <Button
                        variant="success"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        loading={actionType === "approve" && isSubmitting}
                        className="flex-1"
                      >
                        ✅ Approve & Unlock
                      </Button>
                    </>
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