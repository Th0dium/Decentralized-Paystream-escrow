import { useEffect, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

import { useAuthStore } from "./auth-store";

/**
 * Main auth hook that combines wallet connection
 * Refactored for Pure dApp (No Backend)
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

  // Auto-sync wallet to store when connected
  useEffect(() => {
    if (isConnected && walletAddress) {
      // In pure dApp, we don't verify with backend.
      // We assume if wallet is connected, they are authenticated.
      // Roles are derived from on-chain data or defaulted to true for access.
      
      // Check if we need to update the store
      if (store.walletAddress !== walletAddress) {
         // Default roles to true or based on some logic. 
         // For now, allowing access to all dashboards.
         const isCompany = true; 
         const isEmployee = true;
         const isAuditor = true;
         
         store.setAuth(walletAddress, isCompany, isEmployee, isAuditor);
      }
    }
  }, [isConnected, walletAddress, store]);

  // Auto-logout if wallet disconnected
  useEffect(() => {
    if (!isHydrated) return;

    if (store.walletAddress && !isConnected) {
      store.logout();
    }
  }, [isHydrated, isConnected, store.walletAddress, store]);

  const isAuthenticated = isHydrated && isConnected && !!store.walletAddress;

  return {
    isAuthenticated,
    isHydrated,
    walletAddress: store.walletAddress,
    isCompany: store.isCompany,
    isEmployee: store.isEmployee,
    isAuditor: store.isAuditor,
    loading: store.loading,
    error: store.error,
    logout: () => {
      disconnect();
      store.logout();
    },
  };
};

/**
 * Legacy/Unused hooks kept for compatibility but should be replaced by useMyPayments
 */
export const useVerifyWallet = () => {
    return { verify: async () => ({ success: true }), isVerifying: false };
};

export const useEmployeeStreams = (_walletAddress: string | null) => {
  // Deprecated: Use useMyPayments instead
  return { streams: [], loading: false, error: "Deprecated: Use useMyPayments", refetch: async () => {} };
};

export const useCompanyStreams = (_walletAddress: string | null) => {
   // Deprecated: Use useMyPayments instead
  return { streams: [], loading: false, error: "Deprecated: Use useMyPayments", refetch: async () => {} };
};

export const useEmployeeMilestones = (_walletAddress: string | null) => {
   // Deprecated
  return { milestones: [], loading: false, error: "Deprecated", refetch: async () => {} };
};

export const usePendingMilestones = () => {
   // Deprecated
  return { milestones: [], loading: false, error: "Deprecated", refetch: async () => {} };
};
