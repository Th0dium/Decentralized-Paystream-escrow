import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "./auth-store";
import { authApi, paymentsApi, escrowsApi } from "./api-client";
import { AuthResponse, Stream, Milestone } from "./types";

// Hook for auth with proper hydration handling
export const useAuth = () => {
  const auth = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Initialize from localStorage only once on mount
    auth.initFromStorage();
    setIsHydrated(true);
  }, []); // Empty deps - run only once

  // Return auth state, but only mark as ready once hydrated
  return {
    ...auth,
    isHydrated,
    // Ensure isAuthenticated is false until hydration is complete
    isAuthenticated: isHydrated && auth.isAuthenticated
  };
};

// Simplified wallet verification hook
export const useVerifyWallet = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { setLoading, setError, setAuth } = useAuthStore();

  const verify = useCallback(
    async (address: string) => {
      if (!address) {
        console.log("⚠️ No wallet address provided");
        return { success: false, error: "No wallet address" };
      }

      // Normalize address to lowercase
      const normalizedAddress = address.toLowerCase();

      console.log("🔐 Verifying wallet:", normalizedAddress);
      setIsVerifying(true);
      setLoading(true);
      setError(null); // Clear previous errors

      try {
        console.log("📤 Sending verify request to backend...");
        const response: AuthResponse = await authApi.verifyWallet(normalizedAddress);
        console.log("📥 Backend response:", response);

        if (response.success && response.data) {
          console.log("✅ Wallet verified successfully!");
          const { walletAddress, isCompany, isEmployee, isAuditor, token } = response.data;

          // Store JWT token
          if (token && typeof window !== 'undefined') {
            localStorage.setItem("authToken", token);
          }

          // Update auth store
          setAuth(walletAddress, isCompany, isEmployee, isAuditor);

          return { success: true };
        } else {
          const errorMsg = response.error || "Failed to verify wallet";
          console.error("❌ Verification failed:", errorMsg);
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
        console.error("❌ Verification error:", errorMsg, error);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsVerifying(false);
        setLoading(false);
      }
    },
    [setAuth, setError, setLoading]
  );

  return { verify, isVerifying };
};

// Hook for fetching employee streams
export const useEmployeeStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    if (!walletAddress) {
      setStreams([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await paymentsApi.getEmployeeStreams(walletAddress);
      setStreams(response.data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch streams";
      setError(errorMsg);
      console.error("Error fetching employee streams:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return { streams, loading, error, refetch: fetchStreams };
};

// Hook for fetching company streams
export const useCompanyStreams = (walletAddress: string | null) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    if (!walletAddress) {
      setStreams([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await paymentsApi.getCompanyStreams(walletAddress);
      setStreams(response.data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch streams";
      setError(errorMsg);
      console.error("Error fetching company streams:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return { streams, loading, error, refetch: fetchStreams };
};

// Hook for fetching employee milestones
export const useEmployeeMilestones = (walletAddress: string | null) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!walletAddress) {
      setMilestones([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await escrowsApi.getEmployeeMilestones(walletAddress);
      setMilestones(response.data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch milestones";
      setError(errorMsg);
      console.error("Error fetching employee milestones:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  return { milestones, loading, error, refetch: fetchMilestones };
};

// Hook for fetching pending milestones (auditor)
export const usePendingMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await escrowsApi.getPendingMilestones();
      setMilestones(response.data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch milestones";
      setError(errorMsg);
      console.error("Error fetching pending milestones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { milestones, loading, error, refetch };
};
