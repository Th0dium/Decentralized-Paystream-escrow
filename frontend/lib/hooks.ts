import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "./auth-store";
import { authApi, streamsApi, milestonesApi } from "./api-client";
import { AuthResponse, Stream, Milestone } from "./types";

// Hook for auth
export const useAuth = () => {
  const auth = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    auth.initFromStorage();
    setIsHydrated(true);
  }, [auth.isAuthenticated]);

  return { ...auth, isHydrated: isHydrated || auth.isAuthenticated };
};

// Hook for verifying wallet and getting role
export const useVerifyWallet = (walletAddress: string | null) => {
  const { setAuth, setLoading, setError } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = useCallback(async () => {
    if (!walletAddress) {
      console.log("⚠️ No wallet address to verify");
      return;
    }

    console.log("🔐 Verifying wallet:", walletAddress);
    setIsVerifying(true);
    setLoading(true);
    try {
      console.log("📤 Sending verify request to backend...");
      const response: AuthResponse = await authApi.verifyWallet(walletAddress);
      console.log("📥 Backend response:", response);
      if (response.success) {
        console.log("✅ Wallet verified! Role:", response.data.role);
        setAuth(response.data.walletAddress, response.data.role);
      } else {
        console.error("❌ Verification failed:", response);
        setError("Failed to verify wallet");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Verification failed";
      console.error("❌ Verification error:", errorMsg);
      setError(errorMsg);
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  }, [walletAddress, setAuth, setLoading, setError]);

  return { verify, isVerifying };
};

// Hook for fetching employee streams
export const useEmployeeStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchStreams = async () => {
      setLoading(true);
      try {
        const response = await streamsApi.getEmployeeStreams(walletAddress);
        setStreams(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch streams");
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, [walletAddress]);

  return { streams, loading, error };
};

// Hook for fetching company streams
export const useCompanyStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchStreams = async () => {
      setLoading(true);
      try {
        const response = await streamsApi.getCompanyStreams(walletAddress);
        setStreams(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch streams");
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, [walletAddress]);

  return { streams, loading, error };
};

// Hook for fetching employee milestones
export const useEmployeeMilestones = (walletAddress: string | null) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    const fetchMilestones = async () => {
      setLoading(true);
      try {
        const response = await milestonesApi.getEmployeeMilestones(walletAddress);
        setMilestones(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch milestones");
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, [walletAddress]);

  return { milestones, loading, error };
};

// Hook for fetching pending milestones (auditor)
export const usePendingMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const response = await milestonesApi.getPendingMilestones();
      setMilestones(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch milestones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { milestones, loading, error, refetch };
};