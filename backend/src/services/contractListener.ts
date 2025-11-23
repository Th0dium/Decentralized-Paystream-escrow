import { ethers } from 'ethers'
import { PrismaClient } from '@prisma/client'
import { config } from '../config/env'

let prisma: PrismaClient

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

// ABI events - you'll need to extract from your compiled contract
const PAYSTREAM_ABI = [
  'event StreamCreated(uint256 indexed streamId, address indexed company, address indexed employee, address token, uint256 totalAmount, uint64 startTime, uint64 stopTime, uint16 escrowBps, uint256 feeAmount)',
  'event Withdrawn(uint256 indexed streamId, address indexed employee, uint256 payout, uint256 escrowed)',
  'event MilestoneSubmitted(uint256 indexed milestoneId, uint256 indexed streamId, address indexed submitter, uint256 amount, string ipfsHash)',
  'event MilestoneApproved(uint256 indexed milestoneId)',
  'event MilestoneRejected(uint256 indexed milestoneId)',
  'event StreamPaused(uint256 indexed streamId)',
  'event StreamResumed(uint256 indexed streamId)',
  'event StreamCancelled(uint256 indexed streamId)',
]

export async function startContractListener() {
  try {
    if (!config.blockchain.rpcUrl || !config.blockchain.contractAddress) {
      console.log('⚠️  Contract listener disabled (missing RPC_URL or CONTRACT_ADDRESS)')
      return
    }

    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
    const contract = new ethers.Contract(
      config.blockchain.contractAddress,
      PAYSTREAM_ABI,
      provider
    )

    console.log('🔍 Starting contract event listener...')

    // Listen for StreamCreated
    contract.on('StreamCreated', async (...args) => {
      try {
        const event = args[args.length - 1]
        const [streamId, company, employee, token, totalAmount, startTime, stopTime, escrowBps] =
          args.slice(0, -1)

        console.log(`📍 StreamCreated event: streamId=${streamId}`)

        await getPrisma().stream.create({
          data: {
            streamId: parseInt(streamId),
            company: company.toLowerCase(),
            employee: employee.toLowerCase(),
            token: token.toLowerCase(),
            totalAmount: totalAmount.toString(),
            startTime: BigInt(startTime),
            stopTime: BigInt(stopTime),
            escrowBps: parseInt(escrowBps),
            status: 'ACTIVE',
          },
        })

        await logContractEvent('StreamCreated', event.blockNumber, event.transactionHash, {
          streamId,
          company,
          employee,
        })

        console.log(`✅ Stream ${streamId} saved to database`)
      } catch (error) {
        console.error('Error processing StreamCreated:', error)
      }
    })

    // Listen for Withdrawn
    contract.on('Withdrawn', async (...args) => {
      try {
        const event = args[args.length - 1]
        const [streamId, employee, payout, escrowed] = args.slice(0, -1)

        console.log(`📍 Withdrawn event: streamId=${streamId}`)

        await getPrisma().stream.update({
          where: { streamId: parseInt(streamId) },
          data: {
            withdrawn: payout.toString(),
            escrowed: escrowed.toString(),
          },
        })

        await logContractEvent('Withdrawn', event.blockNumber, event.transactionHash, {
          streamId,
          employee,
          payout,
        })

        console.log(`✅ Stream ${streamId} updated`)
      } catch (error) {
        console.error('Error processing Withdrawn:', error)
      }
    })

    // Listen for MilestoneSubmitted
    contract.on('MilestoneSubmitted', async (...args) => {
      try {
        const event = args[args.length - 1]
        const [milestoneId, streamId, submitter, amount, ipfsHash] = args.slice(0, -1)

        console.log(`📍 MilestoneSubmitted event: milestoneId=${milestoneId}`)

        await getPrisma().milestone.create({
          data: {
            milestoneId: parseInt(milestoneId),
            streamId: parseInt(streamId),
            submitter: submitter.toLowerCase(),
            amount: amount.toString(),
            ipfsHash: ipfsHash || null,
            status: 'PENDING',
          },
        })

        await logContractEvent('MilestoneSubmitted', event.blockNumber, event.transactionHash, {
          milestoneId,
          streamId,
          submitter,
        })

        console.log(`✅ Milestone ${milestoneId} saved to database`)
      } catch (error) {
        console.error('Error processing MilestoneSubmitted:', error)
      }
    })

    // Listen for stream state changes
    contract.on('StreamPaused', async (...args) => {
      try {
        const event = args[args.length - 1]
        const [streamId] = args.slice(0, -1)

        console.log(`📍 StreamPaused event: streamId=${streamId}`)

        await getPrisma().stream.update({
          where: { streamId: parseInt(streamId) },
          data: { paused: true, status: 'PAUSED' },
        })

        await logContractEvent('StreamPaused', event.blockNumber, event.transactionHash, {
          streamId,
        })
      } catch (error) {
        console.error('Error processing StreamPaused:', error)
      }
    })

    contract.on('StreamCancelled', async (...args) => {
      try {
        const event = args[args.length - 1]
        const [streamId] = args.slice(0, -1)

        console.log(`📍 StreamCancelled event: streamId=${streamId}`)

        await getPrisma().stream.update({
          where: { streamId: parseInt(streamId) },
          data: { cancelled: true, status: 'CANCELLED' },
        })

        await logContractEvent('StreamCancelled', event.blockNumber, event.transactionHash, {
          streamId,
        })
      } catch (error) {
        console.error('Error processing StreamCancelled:', error)
      }
    })

    console.log('✅ Contract event listener started successfully')
  } catch (error) {
    console.error('Failed to start contract listener:', error)
  }
}

async function logContractEvent(
  eventName: string,
  blockNumber: number,
  transactionHash: string,
  data: any
) {
  try {
    await getPrisma().contractEvent.create({
      data: {
        eventName,
        blockNumber,
        transactionHash,
        data,
        processed: true,
      },
    })
  } catch (error) {
    console.error('Error logging contract event:', error)
  }
}
