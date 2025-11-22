import axios from "axios";
import { ApiResponse, AuthResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000");

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  verifyWallet: async (walletAddress: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/verify-wallet", {
      walletAddress,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  getRole: async (walletAddress: string) => {
    const response = await apiClient.get(`/user/role/${walletAddress}`);
    return response.data;
  },
};

export const streamsApi = {
  getEmployeeStreams: async (walletAddress: string) => {
    const response = await apiClient.get(`/streams/employee/${walletAddress}`);
    return response.data;
  },

  getCompanyStreams: async (walletAddress: string) => {
    const response = await apiClient.get(`/streams/company/${walletAddress}`);
    return response.data;
  },

  getStreamDetails: async (streamId: number) => {
    const response = await apiClient.get(`/streams/${streamId}`);
    return response.data;
  },
};

export const milestonesApi = {
  getEmployeeMilestones: async (walletAddress: string) => {
    const response = await apiClient.get(`/milestones/employee/${walletAddress}`);
    return response.data;
  },

  getPendingMilestones: async () => {
    const response = await apiClient.get("/milestones/pending");
    return response.data;
  },

  getMilestoneDetails: async (milestoneId: number) => {
    const response = await apiClient.get(`/milestones/${milestoneId}`);
    return response.data;
  },
};

export const ipfsApi = {
  uploadFile: async (file: File): Promise<{ ipfsHash: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/ipfs/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default apiClient;
