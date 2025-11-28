import { useEffect, useState, useCallback } from 'react'
import { Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { PAYSTREAM_ABI } from '@/lib/contract-interaction'

const PAYSTREAM_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address

export enum MilestoneStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  CLAIMED = 3
}

export interface EnrichedMilestone {
  milestoneId: number
  streamId: number
  submitter: string
  amount: bigint
  status: MilestoneStatus
  createdAt: number
  approvedAt: number
  // Computed/Extra
  ipfsHash?: string // Not on chain in current contract version, but kept for type compatibility
}

interface UseMyMilestonesReturn {
  milestones: EnrichedMilestone[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMyMilestones(userAddress: Address | null, role: 'employee' | 'auditor' = 'employee'): UseMyMilestonesReturn {
  const publicClient = usePublicClient();
  
  const [data, setData] = useState<UseMyMilestonesReturn>({
    milestones: [],
    isLoading: true,
    error: null,
    refetch: async () => {},
  })

  const fetchMilestones = useCallback(async () => {
    if (!userAddress || !publicClient) {
      setData(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }))

      // 1. Get IDs based on role
      // For auditor, logic is tricky because there is no 'getAuditorMilestones'. 
      // Auditor is assigned to STREAMS. So we need to:
      // a. Get auditor streams.
      // b. Get milestones for those streams.
      // OR: For now, let's focus on 'employee' role first as it has a direct mapping.
      
      let milestoneIds: bigint[] = [];

      if (role === 'employee') {
        const result = await publicClient.readContract({
            address: PAYSTREAM_ADDRESS,
            abi: PAYSTREAM_ABI,
            functionName: 'getEmployeeMilestones',
            args: [userAddress],
        });
        milestoneIds = [...(result as bigint[])];
      } else if (role === 'auditor') {
         try {
            // 1. Get all streams audited by this user
            const streams = await publicClient.readContract({
                address: PAYSTREAM_ADDRESS,
                abi: PAYSTREAM_ABI,
                functionName: 'getAuditorStreams',
                args: [userAddress],
            }) as bigint[];

            if (streams.length > 0) {
                // 2. Get milestones for each stream
                const milestonePromises = streams.map(sId => 
                    publicClient.readContract({
                        address: PAYSTREAM_ADDRESS,
                        abi: PAYSTREAM_ABI,
                        functionName: 'getStreamMilestones',
                        args: [sId]
                    })
                );
                
                const streamMilestones = await Promise.all(milestonePromises);
                // Flatten array of arrays
                milestoneIds = (streamMilestones as bigint[][]).flat();
            }
         } catch (err) {
             console.error("Error fetching auditor milestones:", err);
             // fail silently or throw? Let's just keep empty array
             milestoneIds = [];
         }
      }

      if (milestoneIds.length === 0) {
        setData(prev => ({ ...prev, milestones: [], isLoading: false }));
        return;
      }

      // 2. Fetch Details
      const detailsPromises = milestoneIds.map(id => 
        publicClient.readContract({
            address: PAYSTREAM_ADDRESS,
            abi: PAYSTREAM_ABI,
            functionName: 'getMilestone', // Ensure in ABI
            args: [id]
        })
      );

      const results = await Promise.all(detailsPromises);

      const milestones: EnrichedMilestone[] = results.map((m: any, index) => ({
        milestoneId: Number(milestoneIds[index]),
        streamId: Number(m.streamId),
        submitter: m.submitter,
        amount: m.amount,
        status: m.status,
        createdAt: Number(m.createdAt),
        approvedAt: Number(m.approvedAt),
      }));

      // Sort by newest first
      milestones.sort((a, b) => b.createdAt - a.createdAt);

      setData({
        milestones,
        isLoading: false,
        error: null,
        refetch: fetchMilestones,
      })

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch milestones'
      console.error('❌ Error fetching milestones:', errorMsg)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }))
    }
  }, [userAddress, publicClient, role])

  useEffect(() => {
    fetchMilestones()
  }, [fetchMilestones])

  return { ...data, refetch: fetchMilestones }
}
