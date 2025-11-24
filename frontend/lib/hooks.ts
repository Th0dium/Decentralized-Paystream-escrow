import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "./auth-store";
import { authApi, paymentsApi, escrowsApi } from "./api-client";
import { AuthResponse, Stream, Milestone } from "./types";

// Hook for auth
export const useAuth = () => {
  const auth = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    auth.initFromStorage();
    setIsHydrated(true);
  }, []); // Run only once on mount

  return { ...auth, isHydrated: isHydrated || auth.isAuthenticated };
};

// Hook for verifying wallet and getting role
export const useVerifyWallet = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const authStore = useAuthStore();

  const verify = useCallback(
    async (address: string) => {
      if (!address) {
        console.log("⚠️ No wallet address to verify");
        return;
      }

      console.log("🔐 Verifying wallet:", address);
      setIsVerifying(true);
      authStore.setLoading(true);
      try {
        console.log("📤 Sending verify request to backend...");
        const response: AuthResponse = await authApi.verifyWallet(address);
        console.log("📥 Backend response:", response);
        if (response.success) {
                  console.log("✅ Wallet verified!");
                  const { walletAddress, isCompany, isEmployee, isAuditor } = response.data;
                  authStore.setAuth(walletAddress, isCompany, isEmployee, isAuditor);
                } else {
                  console.error("❌ Verification failed:", response);
                  authStore.setError("Failed to verify wallet");
                }      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
        console.error("❌ Verification error:", errorMsg);
        authStore.setError(errorMsg);
      } finally {
        setIsVerifying(false);
        authStore.setLoading(false);
      }
    },
    [authStore]
  );

  return { verify, isVerifying };
};

// Hook for fetching employee streams
export const useEmployeeStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    if (walletAddress) {
      setLoading(true);
      try {
        const response = await paymentsApi.getEmployeeStreams(walletAddress);
        setStreams(response.data || []);
        setError(null); // Clear previous errors
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch streams");
      } finally {
        setLoading(false);
      }
    } else {
      setStreams([]); // Clear streams if no wallet address
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStreams();
  }, [walletAddress]);

  return { streams, loading, error, refetch: fetchStreams };
};

// Hook for fetching company streams
export const useCompanyStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    if (walletAddress) {
      setLoading(true);
      try {
        const response = await paymentsApi.getCompanyStreams(walletAddress);
        setStreams(response.data || []);
        setError(null); // Clear previous errors
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch streams");
      } finally {
        setLoading(false);
      }
    } else {
      setStreams([]); // Clear streams if no wallet address
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStreams();
  }, [walletAddress]);

  return { streams, loading, error, refetch: fetchStreams };
};

// Hook for fetching employee milestones
export const useEmployeeMilestones = (walletAddress: string | null) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (walletAddress) {
      setLoading(true);
      try {
        const response = await escrowsApi.getEmployeeMilestones(walletAddress);
        setMilestones(response.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch milestones");
      } finally {
        setLoading(false);
      }
    } else {
      setMilestones([]);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchMilestones();
  }, [walletAddress]);

  return { milestones, loading, error, refetch: fetchMilestones };
};

// Hook for fetching pending milestones (auditor)
export const usePendingMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const response = await escrowsApi.getPendingMilestones();
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