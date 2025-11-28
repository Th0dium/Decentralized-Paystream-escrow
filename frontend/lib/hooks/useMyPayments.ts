import { useEffect, useState, useCallback } from 'react'
import { Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { PAYSTREAM_ABI } from '@/lib/contract-interaction'

const PAYSTREAM_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address

export interface EnrichedStream {
  paymentId: number
  company: string
  employee: string
  token: string
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
  const publicClient = usePublicClient(); // Use wagmi hook to get the client
  
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
    functionName: 'getEmployeeStreams' | 'getCompanyStreams' | 'getAuditorStreams',
    userAddress: Address
  ): Promise<number[]> => {
    if (!publicClient) return [];
    try {
      const ids = await publicClient.readContract({
        address: PAYSTREAM_ADDRESS,
        abi: PAYSTREAM_ABI,
        functionName,
        args: [userAddress],
      })
      return (ids as bigint[]).map(id => Number(id))
    } catch (error) {
      console.error(`Error querying ${functionName}:`, error)
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
            functionName: 'getStream', // Use specific getter if available or map to struct
            args: [BigInt(id)],
          })
        )
      )

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

        return {
          paymentId: streamId,
          company: s.company,
          employee: s.employee,
          token: s.token,
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
        queryStreamIds('getEmployeeStreams', userAddress),
        queryStreamIds('getCompanyStreams', userAddress),
        queryStreamIds('getAuditorStreams', userAddress),
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