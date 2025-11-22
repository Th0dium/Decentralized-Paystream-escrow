import { create } from "zustand";
import { AuthState, UserRole } from "./types";

interface AuthStore extends AuthState {
  setAuth: (walletAddress: string, role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  role: null,
  walletAddress: null,
  loading: false,
  error: null,

  setAuth: (walletAddress, role) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("userRole", role || "");
    }
    set({
      isAuthenticated: true,
      walletAddress,
      role,
      error: null,
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("userRole");
      localStorage.removeItem("authToken");
    }
    set({
      isAuthenticated: false,
      walletAddress: null,
      role: null,
      error: null,
    });
  },

  initFromStorage: () => {
    if (typeof window !== "undefined") {
      const walletAddress = localStorage.getItem("walletAddress");
      const storedRole = localStorage.getItem("userRole"); // Read as string | null

      if (walletAddress && storedRole !== null) {
        // Check if the stored value is a valid role, otherwise treat as null
        const role: UserRole = ["COMPANY", "EMPLOYEE", "AUDITOR"].includes(storedRole)
          ? (storedRole as UserRole)
          : null;
        set({
          isAuthenticated: true,
          walletAddress,
          role: role,
        });
      }
    }
  },
}));
