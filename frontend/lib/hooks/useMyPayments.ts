import { useEffect, useState, useCallback } from 'react'
import { Address, parseAbiItem } from 'viem'
import { usePublicClient } from 'wagmi'
import { PAYSTREAM_ABI, getTokenSymbol, getTokenDecimals } from '@/lib/contract-interaction'

const PAYSTREAM_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address

export interface EnrichedPayment {
  paymentId: number
  name: string
  company: string
  employee: string
  auditor: string
  auditorPublicKey: string // Base64-encoded public key for evidence encryption
  token: string // token address
  tokenSymbol: string
  tokenDecimals: number
  streamAmount: bigint
  escrowAmount: bigint
  escrowed: bigint // Current amount remaining in escrow
  startTime: bigint
  stopTime: bigint
  lastWithdrawTime: bigint
  withdrawn: bigint
  paused: boolean
  cancelled: boolean
  totalPausedDuration: bigint
  pausedAt: bigint
  // Computed fields
  userRole: 'company' | 'employee' | 'auditor'
  duration: number // seconds
  elapsed: number // seconds
  progress: number // 0-100
  isActive: boolean
  claimableAmount?: bigint // For employees
}

interface UseMyPaymentsReturn {
  asEmployee: EnrichedPayment[]
  asCompany: EnrichedPayment[]
  asAuditor: EnrichedPayment[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMyPayments(userAddress: Address | null): UseMyPaymentsReturn {
  const publicClient = usePublicClient();
  
  const [data, setData] = useState<UseMyPaymentsReturn>({
    asEmployee: [],
    asCompany: [],
    asAuditor: [],
    isLoading: true,
    error: null,
    refetch: async () => {},
  })

  // Helper: Query payment IDs for a role
  const queryPaymentIds = useCallback(async (
    role: 'employee' | 'company' | 'auditor',
    userAddress: Address
  ): Promise<number[]> => {
    if (!publicClient) return [];
    try {
      // Use contract functions for all roles
      let functionName: 'getEmployeePayments' | 'getCompanyPayments' | 'getAuditorPayments';

      switch (role) {
        case 'employee':
          functionName = 'getEmployeePayments';
          break;
        case 'company':
          functionName = 'getCompanyPayments';
          break;
        case 'auditor':
          functionName = 'getAuditorPayments';
          break;
      }

      const ids = await publicClient.readContract({
        address: PAYSTREAM_ADDRESS,
        abi: PAYSTREAM_ABI,
        functionName,
        args: [userAddress],
      })
      return (ids as bigint[]).map(id => Number(id))
    } catch (error) {
      console.error(`Error querying payments for ${role}:`, error)
      return []
    }
  }, [publicClient]);

  // Helper: Fetch full payment details
  const fetchPaymentsDetails = useCallback(async (
    paymentIds: number[],
    userRole: 'company' | 'employee' | 'auditor',
  ): Promise<EnrichedPayment[]> => {
    if (!publicClient || paymentIds.length === 0) return []

    try {
      const paymentDetails = await Promise.all(
        paymentIds.map(id =>
          publicClient.readContract({
            address: PAYSTREAM_ADDRESS,
            abi: PAYSTREAM_ABI,
            functionName: 'getPayment',
            args: [BigInt(id)],
          })
        )
      )

      // Fetch token details for all unique tokens in parallel
      const uniqueTokenAddresses = Array.from(new Set(paymentDetails.map(p => (p as any).token)));
      const tokenDetailsPromises = uniqueTokenAddresses.map(async (tokenAddress: Address) => {
        const [symbol, decimals] = await Promise.all([
          getTokenSymbol(tokenAddress),
          getTokenDecimals(tokenAddress)
        ]);
        return { [tokenAddress]: { symbol, decimals } };
      });
      const allTokenDetails = Object.assign({}, ...(await Promise.all(tokenDetailsPromises)));


      return paymentDetails.map((payment, index) => {
        const p = payment as any // Payment struct from contract
        const paymentId = paymentIds[index]
        const now = Math.floor(Date.now() / 1000)
        const startTime = Number(p.startTime)
        const stopTime = Number(p.stopTime)
        const duration = stopTime - startTime
        const elapsed = Math.max(0, Math.min(now - startTime, duration))
        const progress = duration > 0 ? Math.round((elapsed / duration) * 100) : 0

        // Calculate claimable amount for employees
        let claimableAmount: bigint | undefined
        if (userRole === 'employee') {
          // Total claimable from stream portion
          const totalVested = (BigInt(elapsed) * p.streamAmount) / BigInt(duration)
          claimableAmount = totalVested - p.withdrawn
          // Ensure non-negative
          if (claimableAmount < 0n) claimableAmount = 0n
        }
        
        const tokenInfo = allTokenDetails[p.token];

        return {
          paymentId: paymentId,
          name: p.name,
          company: p.company,
          employee: p.employee,
          auditor: p.auditor,
          auditorPublicKey: p.auditorPublicKey,
          token: p.token,
          tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
          tokenDecimals: tokenInfo?.decimals || 18,
          streamAmount: p.streamAmount,
          escrowAmount: p.escrowAmount,
          escrowed: p.escrowed,
          startTime: p.startTime,
          stopTime: p.stopTime,
          lastWithdrawTime: p.lastWithdrawTime,
          withdrawn: p.withdrawn,
          paused: p.paused,
          cancelled: p.cancelled,
          totalPausedDuration: p.totalPausedDuration,
          pausedAt: p.pausedAt,
          userRole,
          duration,
          elapsed,
          progress,
          isActive: !p.paused && !p.cancelled && now < stopTime,
          claimableAmount,
        }
      })
    } catch (error) {
      console.error(`Error fetching payment details for ${userRole}:`, error)
      return []
    }
  }, [publicClient]);

  const fetchPayments = useCallback(async () => {
    if (!userAddress || !publicClient) {
      setData(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }))

      // Query all 3 role arrays in parallel
      const [employeeIds, companyIds, auditorIds] = await Promise.all([
        queryPaymentIds('employee', userAddress),
        queryPaymentIds('company', userAddress),
        queryPaymentIds('auditor', userAddress),
      ])

      // Fetch full payment details for each ID
      const [employeePayments, companyPayments, auditorPayments] = await Promise.all([
        fetchPaymentsDetails(employeeIds, 'employee'),
        fetchPaymentsDetails(companyIds, 'company'),
        fetchPaymentsDetails(auditorIds, 'auditor'),
      ])

      setData({
        asEmployee: employeePayments,
        asCompany: companyPayments,
        asAuditor: auditorPayments,
        isLoading: false,
        error: null,
        refetch: fetchPayments,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch payments'
      console.error('❌ Error fetching payments:', errorMsg)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }))
    }
  }, [userAddress, publicClient, queryPaymentIds, fetchPaymentsDetails])

  useEffect(() => {
    fetchPayments()
  }, [userAddress, fetchPayments])

  return { ...data, refetch: fetchPayments }
}