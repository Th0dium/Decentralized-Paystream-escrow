import { create } from "zustand";
import { AuthState } from "./types";

interface AuthStore extends AuthState {
  setAuth: (walletAddress: string, isCompany: boolean, isEmployee: boolean, isAuditor: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  isCompany: false,
  isEmployee: false,
  isAuditor: false,
  walletAddress: null,
  loading: false,
  error: null,

  setAuth: (walletAddress, isCompany, isEmployee, isAuditor) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("isCompany", String(isCompany));
      localStorage.setItem("isEmployee", String(isEmployee));
      localStorage.setItem("isAuditor", String(isAuditor));
    }
    set({
      isAuthenticated: true,
      walletAddress,
      isCompany,
      isEmployee,
      isAuditor,
      error: null,
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("isCompany");
      localStorage.removeItem("isEmployee");
      localStorage.removeItem("isAuditor");
      localStorage.removeItem("authToken");
    }
    set({
      isAuthenticated: false,
      walletAddress: null,
      isCompany: false,
      isEmployee: false,
      isAuditor: false,
      error: null,
    });
  },

  initFromStorage: () => {
    if (typeof window !== "undefined") {
      const walletAddress = localStorage.getItem("walletAddress");
      const isCompany = localStorage.getItem("isCompany") === 'true';
      const isEmployee = localStorage.getItem("isEmployee") === 'true';
      const isAuditor = localStorage.getItem("isAuditor") === 'true';

      if (walletAddress) {
        set({
          isAuthenticated: true,
          walletAddress,
          isCompany,
          isEmployee,
          isAuditor,
        });
      }
    }
  },
}));