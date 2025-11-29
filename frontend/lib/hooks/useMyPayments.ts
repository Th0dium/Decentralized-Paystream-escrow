import { useEffect, useState, useCallback } from 'react'
import { Address, parseAbiItem } from 'viem'
import { usePublicClient } from 'wagmi'
import { PAYSTREAM_ABI, getTokenSymbol, getTokenDecimals } from '@/lib/contract-interaction' // Import new functions

const PAYSTREAM_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address

export interface EnrichedStream {
  paymentId: number
  company: string
  employee: string
  token: string // token address
  tokenSymbol: string // Added
  tokenDecimals: number // Added
  streamAmount: bigint
  escrowAmount: bigint
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
  asEmployee: EnrichedStream[]
  asCompany: EnrichedStream[]
  asAuditor: EnrichedStream[]
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

  // Helper: Query stream IDs for a role
  const queryStreamIds = useCallback(async (
    role: 'employee' | 'company' | 'auditor',
    userAddress: Address
  ): Promise<number[]> => {
    if (!publicClient) return [];
    try {
      let functionName: 'getEmployeeStreams' | 'getCompanyStreams' | 'getAuditorStreams';
      
      switch (role) {
        case 'employee':
          functionName = 'getEmployeeStreams';
          break;
        case 'company':
          functionName = 'getCompanyStreams';
          break;
        case 'auditor':
          functionName = 'getAuditorStreams';
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
      console.error(`Error querying streams for ${role}:`, error)
      return []
    }
  }, [publicClient]);

  // Helper: Fetch full stream details
  const fetchStreamsDetails = useCallback(async (
    streamIds: number[],
    userRole: 'company' | 'employee' | 'auditor',
  ): Promise<EnrichedStream[]> => {
    if (!publicClient || streamIds.length === 0) return []

    try {
      const streamDetails = await Promise.all(
        streamIds.map(id =>
          publicClient.readContract({
            address: PAYSTREAM_ADDRESS,
            abi: PAYSTREAM_ABI,
            functionName: 'getStream',
            args: [BigInt(id)],
          })
        )
      )

      // Fetch token details for all unique tokens in parallel
      const uniqueTokenAddresses = Array.from(new Set(streamDetails.map(s => (s as any).token)));
      const tokenDetailsPromises = uniqueTokenAddresses.map(async (tokenAddress: Address) => {
        const [symbol, decimals] = await Promise.all([
          getTokenSymbol(tokenAddress),
          getTokenDecimals(tokenAddress)
        ]);
        return { [tokenAddress]: { symbol, decimals } };
      });
      const allTokenDetails = Object.assign({}, ...(await Promise.all(tokenDetailsPromises)));


      return streamDetails.map((stream, index) => {
        const s = stream as any // Stream struct from contract
        const streamId = streamIds[index]
        const now = Math.floor(Date.now() / 1000)
        const startTime = Number(s.startTime)
        const stopTime = Number(s.stopTime)
        const duration = stopTime - startTime
        const elapsed = Math.max(0, Math.min(now - startTime, duration))
        const progress = duration > 0 ? Math.round((elapsed / duration) * 100) : 0

        // Calculate claimable amount for employees
        let claimableAmount: bigint | undefined
        if (userRole === 'employee') {
          // Total claimable from stream portion
          const totalVested = (BigInt(elapsed) * s.streamAmount) / BigInt(duration)
          claimableAmount = totalVested - s.withdrawn
          // Ensure non-negative
          if (claimableAmount < 0n) claimableAmount = 0n
        }
        
        const tokenInfo = allTokenDetails[s.token];

        return {
          paymentId: streamId,
          company: s.company,
          employee: s.employee,
          token: s.token,
          tokenSymbol: tokenInfo?.symbol || 'UNKNOWN', // Added
          tokenDecimals: tokenInfo?.decimals || 18,    // Added
          streamAmount: s.streamAmount,
          escrowAmount: s.escrowAmount,
          startTime: s.startTime,
          stopTime: s.stopTime,
          lastWithdrawTime: s.lastWithdrawTime,
          withdrawn: s.withdrawn,
          paused: s.paused,
          cancelled: s.cancelled,
          totalPausedDuration: s.totalPausedDuration,
          pausedAt: s.pausedAt,
          userRole,
          duration,
          elapsed,
          progress,
          isActive: !s.paused && !s.cancelled && now < stopTime,
          claimableAmount,
        }
      })
    } catch (error) {
      console.error(`Error fetching stream details for ${userRole}:`, error)
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
        queryStreamIds('employee', userAddress),
        queryStreamIds('company', userAddress),
        queryStreamIds('auditor', userAddress),
      ])

      // Fetch full stream details for each ID
      const [employeeStreams, companyStreams, auditorStreams] = await Promise.all([
        fetchStreamsDetails(employeeIds, 'employee'),
        fetchStreamsDetails(companyIds, 'company'),
        fetchStreamsDetails(auditorIds, 'auditor'),
      ])

      setData({
        asEmployee: employeeStreams,
        asCompany: companyStreams,
        asAuditor: auditorStreams,
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
  }, [userAddress, publicClient, queryStreamIds, fetchStreamsDetails])

  useEffect(() => {
    fetchPayments()
  }, [userAddress, fetchPayments])

  return { ...data, refetch: fetchPayments }
}