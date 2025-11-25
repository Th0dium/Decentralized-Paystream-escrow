/**
 * Application constants and configuration
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "10000", 10),
} as const;

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  WALLET_ADDRESS: "walletAddress",
  IS_COMPANY: "isCompany",
  IS_EMPLOYEE: "isEmployee",
  IS_AUDITOR: "isAuditor",
  AUTH_TOKEN: "authToken",
} as const;

// Wallet Configuration
export const WALLET_CONFIG = {
  CONNECTOR_ID: "injected",
  TARGET: "metaMask",
} as const;
