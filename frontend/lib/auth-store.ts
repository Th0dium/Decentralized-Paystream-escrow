import { create } from "zustand";

import { STORAGE_KEYS } from "./constants";

interface AuthStore {
  // Auth data
  walletAddress: string | null;
  isCompany: boolean;
  isEmployee: boolean;
  isAuditor: boolean;

  // UI state
  loading: boolean;
  error: string | null;

  // Actions
  setAuth: (walletAddress: string, isCompany: boolean, isEmployee: boolean, isAuditor: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  walletAddress: null,
  isCompany: false,
  isEmployee: false,
  isAuditor: false,
  loading: false,
  error: null,

  // Set authentication data
  setAuth: (walletAddress, isCompany, isEmployee, isAuditor) => {
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
      localStorage.setItem(STORAGE_KEYS.IS_COMPANY, String(isCompany));
      localStorage.setItem(STORAGE_KEYS.IS_EMPLOYEE, String(isEmployee));
      localStorage.setItem(STORAGE_KEYS.IS_AUDITOR, String(isAuditor));
    }

    // Update store
    set({
      walletAddress,
      isCompany,
      isEmployee,
      isAuditor,
      error: null,
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Clear all auth data
  logout: () => {
    // Clear localStorage
    if (typeof window !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    }

    // Reset store
    set({
      walletAddress: null,
      isCompany: false,
      isEmployee: false,
      isAuditor: false,
      error: null,
    });
  },

  // Hydrate from localStorage on app start
  hydrate: () => {
    if (typeof window === "undefined") return;

    const walletAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
    const isCompany = localStorage.getItem(STORAGE_KEYS.IS_COMPANY) === "true";
    const isEmployee = localStorage.getItem(STORAGE_KEYS.IS_EMPLOYEE) === "true";
    const isAuditor = localStorage.getItem(STORAGE_KEYS.IS_AUDITOR) === "true";

    if (walletAddress) {
      set({
        walletAddress,
        isCompany,
        isEmployee,
        isAuditor,
      });
    }
  },
}));
