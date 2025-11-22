// Authentication types
export type UserRole = "COMPANY" | "EMPLOYEE" | "AUDITOR" | null;

export interface AuthResponse {
  success: boolean;
  data: {
    walletAddress: string;
    role: UserRole;
    isNewUser?: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole;
  walletAddress: string | null;
  loading: boolean;
  error: string | null;
}

// Stream types
export interface Stream {
  streamId: number;
  company: string;
  employee: string;
  token: string;
  totalAmount: string;
  startTime: number;
  stopTime: number;
  lastWithdrawTime: number;
  withdrawn: string;
  escrowBps: number;
  escrowed: string;
  paused: boolean;
  cancelled: boolean;
  totalPausedDuration: number;
  pausedAt: number;
}

export interface StreamDetails extends Stream {
  availableAmount: string;
  totalUnlockedAmount: string;
  progress: number; // percentage
}

// Milestone types
export enum MilestoneStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CLAIMED = "CLAIMED",
}

export interface Milestone {
  milestoneId: number;
  streamId: number;
  submitter: string;
  amount: string;
  status: MilestoneStatus;
  createdAt: number;
  approvedAt?: number;
  ipfsHash?: string;
}

// Transaction types
export interface TransactionState {
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  error?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
