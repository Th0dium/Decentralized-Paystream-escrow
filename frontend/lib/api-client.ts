import axios from "axios";
import { ApiResponse, AuthResponse, Stream, Milestone } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000");

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
});

export const authApi = {
  verifyWallet: async (address: string): Promise<AuthResponse> => {
    // In a real app, you'd send a signature to be verified
    const response = await apiClient.post("/auth/verify", { address });
    return response.data;
  },
};

export const streamsApi = {
  getEmployeeStreams: async (
    address: string
  ): Promise<ApiResponse<Stream[]>> => {
    const response = await apiClient.get(`/streams/employee/${address}`);
    return response.data;
  },
  getCompanyStreams: async (
    address: string
  ): Promise<ApiResponse<Stream[]>> => {
    const response = await apiClient.get(`/streams/company/${address}`);
    return response.data;
  },
};

export const milestonesApi = {
  getEmployeeMilestones: async (
    address: string
  ): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiClient.get(`/milestones/employee/${address}`);
    return response.data;
  },
  getPendingMilestones: async (): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiClient.get("/milestones/pending");
    return response.data;
  },
};

export default apiClient;