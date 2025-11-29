import { useEffect, useState, useCallback } from 'react'
import { Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { PAYSTREAM_ABI, getTokenSymbol, getTokenDecimals } from '@/lib/contract-interaction' 

const PAYSTREAM_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address

export enum MilestoneStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  CLAIMED = 3
}

export interface EnrichedMilestone {
  milestoneId: number
  paymentId: number
  submitter: string
  amount: bigint
  status: MilestoneStatus
  createdAt: number
  approvedAt: number
  tokenSymbol: string 
  tokenDecimals: number 
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
            // 1. Get all payments audited by this user
            const payments = await publicClient.readContract({
                address: PAYSTREAM_ADDRESS,
                abi: PAYSTREAM_ABI,
                functionName: 'getAuditorPayments',
                args: [userAddress],
            }) as bigint[];

            if (payments.length > 0) {
                // 2. Get milestones for each payment
                const milestonePromises = payments.map(pId => 
                    publicClient.readContract({
                        address: PAYSTREAM_ADDRESS,
                        abi: PAYSTREAM_ABI,
                        functionName: 'getPaymentMilestones',
                        args: [pId]
                    })
                );
                
                const paymentMilestones = await Promise.all(milestonePromises);
                // Flatten array of arrays
                milestoneIds = (paymentMilestones as bigint[][]).flat();
            }
         } catch (err) {
             console.error("Error fetching auditor milestones:", err);
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
            functionName: 'getMilestone',
            args: [id]
        })
      );

      const results = await Promise.all(detailsPromises);

      // Extract unique paymentIds
      const uniquePaymentIds = Array.from(new Set(results.map((m: any) => m.paymentId)));
      const paymentTokenMap: { [paymentId: number]: Address } = {};
      const tokenAddressSet = new Set<Address>();

      if (uniquePaymentIds.length > 0) {
        const paymentPromises = uniquePaymentIds.map(paymentId =>
            publicClient.readContract({
                address: PAYSTREAM_ADDRESS,
                abi: PAYSTREAM_ABI,
                functionName: 'getPayment',
                args: [BigInt(paymentId)],
            })
        );
        const paymentResults = await Promise.all(paymentPromises);
        paymentResults.forEach((p: any, index) => {
            const currentPaymentId = Number(uniquePaymentIds[index]);
            paymentTokenMap[currentPaymentId] = p.token;
            tokenAddressSet.add(p.token);
        });
      }

      // Fetch token details for all unique tokens in parallel
      const uniqueTokenAddresses = Array.from(tokenAddressSet);
      const tokenDetailsPromises = uniqueTokenAddresses.map(async (tokenAddress: Address) => {
        const [symbol, decimals] = await Promise.all([
          getTokenSymbol(tokenAddress),
          getTokenDecimals(tokenAddress)
        ]);
        return { [tokenAddress]: { symbol, decimals } };
      });
      const allTokenDetails = Object.assign({}, ...(await Promise.all(tokenDetailsPromises)));

      const milestones: EnrichedMilestone[] = results.map((m: any, index) => {
        const tokenAddress = paymentTokenMap[Number(m.paymentId)];
        const tokenInfo = allTokenDetails[tokenAddress];

        return {
          milestoneId: Number(milestoneIds[index]),
          paymentId: Number(m.paymentId),
          submitter: m.submitter,
          amount: m.amount,
          status: m.status,
          createdAt: Number(m.createdAt),
          approvedAt: Number(m.approvedAt),
          tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
          tokenDecimals: tokenInfo?.decimals || 18,
        };
      });

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
