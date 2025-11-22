import { useEffect, useState } from "react";
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
  }, [auth]);

  return { ...auth, isHydrated };
};

// Hook for verifying wallet and getting role
export const useVerifyWallet = (walletAddress: string | null) => {
  const { setAuth, setLoading, setError } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async () => {
    if (!walletAddress) return;

    setIsVerifying(true);
    setLoading(true);
    try {
      const response: AuthResponse = await authApi.verifyWallet(walletAddress);
      if (response.success) {
        setAuth(response.data.walletAddress, response.data.role);
      } else {
        setError("Failed to verify wallet");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  };

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
