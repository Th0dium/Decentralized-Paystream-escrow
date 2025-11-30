"use client";

import { useState } from "react";
import { Card } from "@/components/Card";
import { useAuth } from "@/lib/hooks";
import { useMyPayments, EnrichedPayment } from "@/lib/hooks/useMyPayments";
import { formatUnits } from "viem";
import { withdrawPayment } from "@/lib/contract-interaction";
import { Button } from "@/components/Button";
import PaymentDetailsModal from "@/components/PaymentDetailsModal";
import UploadEvidenceModal from "@/components/UploadEvidenceModal";
import { uploadToIPFS } from "@/lib/ipfs";
import { encryptWithPublicKey, serializeEncryptedData, isValidPublicKey } from "@/lib/encryption";
import { submitMilestoneWithEvidence } from "@/lib/contract-interaction";

const ITEMS_PER_PAGE = 10;

export default function EmployeeStreamsContent() {
  const { walletAddress, isEmployee } = useAuth();
  const { asEmployee: streams, isLoading: loading, error, refetch } = useMyPayments(walletAddress as any);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload Evidence Modal State
  const [uploadModalPayment, setUploadModalPayment] = useState<EnrichedPayment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Client-side pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedStreams = streams.slice(startIdx, endIdx);
  const totalPages = Math.ceil(streams.length / ITEMS_PER_PAGE);

  const handleAction = async (paymentId: number, type: "pause" | "resume" | "cancel" | "withdraw") => {
    if (type !== "withdraw") return;
    
    try {
      setIsSubmitting(true);
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      await withdrawPayment(contractAddress as any, paymentId.toString());
      // Refetch after withdraw and close modal
      await refetch();
      setSelectedPayment(null);
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Withdraw failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const handleUploadEvidence = async (file: File, milestoneAmount: string) => {
    setIsUploading(true);
    try {
      if (!uploadModalPayment) {
        throw new Error("Payment data missing");
      }

      console.log("📤 === EVIDENCE UPLOAD WORKFLOW ===");
      console.log(`📝 Payment: ${uploadModalPayment.name} (#${uploadModalPayment.paymentId})`);
      console.log(`💰 Milestone Amount: ${milestoneAmount}`);
      console.log(`📄 File: ${file.name}`);

      // Step 1: Upload file to IPFS
      console.log("\n1️⃣ Uploading file to IPFS...");
      const ipfsHash = await uploadToIPFS(file);
      console.log(`✅ IPFS Hash: ${ipfsHash}`);

      // Step 2: Check for encryption requirement
      console.log("\n2️⃣ Checking encryption requirements...");
      const auditorPublicKey = (uploadModalPayment as any).auditorPublicKey;
      
      let evidencePayload = ipfsHash; // Default: send plain IPFS hash

      if (auditorPublicKey && auditorPublicKey.length > 0) {
          console.log("🔒 Encryption enabled for this payment.");
          
          if (!isValidPublicKey(auditorPublicKey)) {
            throw new Error("Invalid auditor public key format");
          }

          // Step 3: Encrypt IPFS hash with auditor's public key
          console.log("3️⃣ Encrypting IPFS hash with auditor's public key...");
          const encryptedData = encryptWithPublicKey(ipfsHash, auditorPublicKey);
          evidencePayload = serializeEncryptedData(encryptedData); // Send JSON payload
          
          console.log(`✅ Encrypted successfully`);
          console.log(`   Ciphertext: ${encryptedData.ciphertext.substring(0, 20)}...`);
      } else {
          console.log("🔓 Encryption disabled. Submitting plain IPFS hash.");
      }

      // Step 4: Submit milestone with evidence (encrypted or plain) on-chain
      console.log("\n4️⃣ Submitting milestone with evidence on-chain...");
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error("Contract address not configured");

      await submitMilestoneWithEvidence(
        contractAddress as any,
        uploadModalPayment.paymentId.toString(),
        milestoneAmount,
        evidencePayload,
        uploadModalPayment.tokenDecimals
      );

      console.log("✅ Milestone submitted!");

      // Refetch and close modal
      await refetch();
      setUploadModalPayment(null);

      if (auditorPublicKey && auditorPublicKey.length > 0) {
        alert("✅ Evidence uploaded successfully! The Auditor can now decrypt it using the Password provided by the Company.");
      } else {
        alert("✅ Evidence uploaded successfully! The file is publicly accessible via IPFS.");
      }

    } catch (error) {
      console.error("❌ Upload failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert("Upload failed: " + errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-slate-400">Loading streams...</div>
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
        <h1 className="text-3xl font-bold text-slate-100">My Salary Streams</h1>
        <Button
          onClick={handleRefresh}
          variant="secondary"
        >
          Refresh
        </Button>
      </div>

      {!isEmployee && (
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 You don&apos;t have an employee role. Data shown below is for viewing only.
          </p>
        </div>
      )}

      {streams.length === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-8">
            You have no active streams. Contact your company to create one.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {paginatedStreams.map((stream) => (
              <div 
                key={stream.paymentId} 
                onClick={() => setSelectedPayment(stream)}
                className="cursor-pointer"
              >
                <Card className="hover:bg-slate-800/50 transition-colors border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-100">{stream.name}</h3>
                                {stream.escrowAmount > 0n && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-700/50">
                                        Escrow
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-slate-500">#{stream.paymentId}</span>
                        </div>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${ 
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

                    <div className="flex justify-between text-sm mb-2">
                        <div className="text-slate-400 flex gap-3">
                            <span>Stream: <span className="text-slate-200">{formatUnits(stream.streamAmount, stream.tokenDecimals)}</span></span>
                            {stream.escrowAmount > 0n && (
                                <span>Escrow: <span className="text-slate-200">{formatUnits(stream.escrowed, stream.tokenDecimals)}</span></span>
                            )}
                             <span className="text-slate-400 text-xs self-center">{stream.tokenSymbol}</span>
                        </div>
                         <div className="text-slate-400">
                            Progress: <span className="text-blue-400">{stream.progress}%</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mb-3">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${stream.progress}%` }}
                        />
                    </div>

                    {/* Upload Evidence Button - Only show for payments with escrow */}
                    {stream.escrowAmount > 0n && (
                        <div className="flex justify-end pt-2 border-t border-slate-700">
                            <Button
                                variant="secondary"
                                className="text-xs py-1.5 px-4 h-auto"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadModalPayment(stream);
                                }}
                            >
                                📎 Upload Evidence
                            </Button>
                        </div>
                    )}
                </Card>
              </div>
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

      <PaymentDetailsModal
        isOpen={!!selectedPayment}
        closeModal={() => setSelectedPayment(null)}
        payment={selectedPayment}
        onAction={handleAction}
        isSubmitting={isSubmitting}
      />

      <UploadEvidenceModal
        isOpen={!!uploadModalPayment}
        closeModal={() => setUploadModalPayment(null)}
        payment={uploadModalPayment}
        onUpload={handleUploadEvidence}
        isUploading={isUploading}
      />
    </div>
  );
}
