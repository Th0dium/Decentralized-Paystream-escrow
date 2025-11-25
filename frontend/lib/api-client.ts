import axios from "axios";

import type { ApiResponse, AuthResponse, Stream, Milestone } from "./types";
import { API_CONFIG, STORAGE_KEYS } from "./constants";

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  verifyWallet: async (address: string): Promise<AuthResponse> => {
    // In a real app, you'd send a signature to be verified
    const response = await apiClient.post("/auth/verify-wallet", { walletAddress: address });
    return response.data;
  },
};

export const paymentsApi = {
  getEmployeeStreams: async (
    address: string
  ): Promise<ApiResponse<Stream[]>> => {
    const response = await apiClient.get(`/payments/employee/${address}`);
    return response.data;
  },
  getCompanyStreams: async (
    address: string
  ): Promise<ApiResponse<Stream[]>> => {
    const response = await apiClient.get(`/payments/company/${address}`);
    return response.data;
  },
};

export const escrowsApi = {
  getEmployeeMilestones: async (
    address: string
  ): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiClient.get(`/escrows/employee/${address}`);
    return response.data;
  },
  getPendingMilestones: async (): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiClient.get("/escrows/pending");
    return response.data;
  },
};

export default apiClient;