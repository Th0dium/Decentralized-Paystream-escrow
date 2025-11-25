import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

import { useAuthStore } from "./auth-store";
import { authApi, paymentsApi, escrowsApi } from "./api-client";
import { STORAGE_KEYS } from "./constants";
import type { AuthResponse, Stream, Milestone } from "./types";

/**
 * Main auth hook that combines wallet connection with backend authentication
 */
export const useAuth = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const { address: walletAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const store = useAuthStore();

  // Hydrate from localStorage on mount (once)
  useEffect(() => {
    store.hydrate();
    setIsHydrated(true);
  }, []);

  // Auto-logout if wallet disconnected or address changed
  useEffect(() => {
    if (!isHydrated) return;

    // If we have stored auth but no wallet connected -> logout
    if (store.walletAddress && !isConnected) {
      store.logout();
      return;
    }

    // If wallet connected but address doesn't match stored -> logout
    if (isConnected && store.walletAddress && walletAddress) {
      const currentAddress = walletAddress.toLowerCase();
      const storedAddress = store.walletAddress.toLowerCase();

      if (currentAddress !== storedAddress) {
        disconnect();
        store.logout();
      }
    }
  }, [isHydrated, isConnected, walletAddress, store.walletAddress]);

  // User is fully authenticated if:
  // 1. Store has been hydrated
  // 2. Wallet is connected
  // 3. Store has wallet address (verified with backend)
  const isAuthenticated = isHydrated && isConnected && !!store.walletAddress;

  return {
    // Auth state
    isAuthenticated,
    isHydrated,
    walletAddress: store.walletAddress,
    isCompany: store.isCompany,
    isEmployee: store.isEmployee,
    isAuditor: store.isAuditor,

    // UI state
    loading: store.loading,
    error: store.error,

    // Actions
    logout: () => {
      disconnect();
      store.logout();
    },
  };
};

/**
 * Hook for verifying wallet with backend
 */
export const useVerifyWallet = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { setLoading, setError, setAuth } = useAuthStore();

  const verify = useCallback(
    async (address: string) => {
      if (!address) {
        return { success: false, error: "No wallet address" };
      }

      const normalizedAddress = address.toLowerCase();
      setIsVerifying(true);
      setLoading(true);
      setError(null);

      try {
        const response: AuthResponse = await authApi.verifyWallet(normalizedAddress);

        if (response.success && response.data) {
          const { walletAddress, isCompany, isEmployee, isAuditor, token } = response.data;

          // Store JWT token
          if (token && typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          }

          // Update auth store
          setAuth(walletAddress, isCompany, isEmployee, isAuditor);

          return { success: true };
        } else {
          const errorMsg = response.error || "Failed to verify wallet";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
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

/**
 * Hook for fetching employee streams
 */
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

/**
 * Hook for fetching company streams
 */
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

/**
 * Hook for fetching employee milestones
 */
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

/**
 * Hook for fetching pending milestones (auditor)
 */
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
