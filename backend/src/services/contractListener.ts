import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

let prisma: PrismaClient;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

const PAYSTREAM_ABI = [
    // Stream Management Events
    "event StreamCreated(uint256 indexed streamId, address indexed company, address indexed employee, address token, uint256 streamAmount, uint256 escrowAmount, uint64 startTime, uint64 stopTime)",
    "event Withdrawn(uint256 indexed streamId, address indexed employee, uint256 amount)",
    "event StreamPaused(uint256 indexed streamId, address indexed by)",
    "event StreamResumed(uint256 indexed streamId, address indexed by)",
    "event StreamCancelled(uint256 indexed streamId, address indexed by, uint256 refunded)",

    // Milestone Events
    "event MilestoneSubmitted(uint256 indexed milestoneId, uint256 indexed streamId, address indexed employee, uint256 amount, bytes32 descriptionHash)",
    "event MilestoneApproved(uint256 indexed milestoneId, address indexed auditor)",
    "event MilestoneRejected(uint256 indexed milestoneId, address indexed auditor)",
    "event MilestoneClaimed(uint256 indexed milestoneId, address indexed employee, uint256 amount)",

    // Auditor Management Events
    "event StreamAuditorAdded(uint256 indexed streamId, address indexed auditor)",
    "event StreamAuditorRemoved(uint256 indexed streamId, address indexed auditor)",

    // Admin Events
    "event TokenWhitelistUpdated(address indexed token, bool isWhitelisted)",
    "event NewStreamCreationPaused(bool status)"
];

export async function startContractListener() {
  try {
    if (!config.blockchain.rpcUrl || !config.blockchain.contractAddress) {
      console.log('⚠️  Contract listener disabled (missing RPC_URL or CONTRACT_ADDRESS)');
      return;
    }

    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    const contract = new ethers.Contract(
      config.blockchain.contractAddress,
      PAYSTREAM_ABI,
      provider
    );

    console.log('🔍 Starting contract event listener...');

    // === STREAM CREATION EVENT ===
    contract.on('StreamCreated', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId, company, employee, token, streamAmount, escrowAmount, startTime, stopTime] = args.slice(0, -1);

        console.log(`📍 StreamCreated event: streamId=${streamId}`);

        await getPrisma().payment.create({
          data: {
            paymentId: parseInt(streamId.toString()),
            company: company.toLowerCase(),
            employee: employee.toLowerCase(),
            token: token.toLowerCase(),
            totalAmount: (BigInt(streamAmount) + BigInt(escrowAmount)).toString(),
            startTime: BigInt(startTime),
            stopTime: BigInt(stopTime),
            withdrawn: "0",
            paused: false,
            cancelled: false,
            totalPausedDuration: 0n,
          },
        });

        // Update user roles
        await upsertUser(company.toLowerCase(), { isCompany: true });
        await upsertUser(employee.toLowerCase(), { isEmployee: true });

        await logContractEvent('StreamCreated', event.blockNumber, event.transactionHash, {
          streamId: streamId.toString(),
          company,
          employee,
          streamAmount: streamAmount.toString(),
          escrowAmount: escrowAmount.toString()
        });
        console.log(`✅ Stream ${streamId} saved, roles updated`);

      } catch (error) {
        console.error('❌ Error processing StreamCreated:', error);
      }
    });

    // === WITHDRAWAL EVENT ===
    contract.on('Withdrawn', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId, employee, amount] = args.slice(0, -1);

        console.log(`📍 Withdrawn event: streamId=${streamId}, amount=${amount}`);

        await getPrisma().payment.update({
          where: { paymentId: parseInt(streamId.toString()) },
          data: {
            withdrawn: (BigInt(amount)).toString(),
            lastWithdrawTime: BigInt(Math.floor(Date.now() / 1000)),
          },
        });

        await logContractEvent('Withdrawn', event.blockNumber, event.transactionHash, { streamId: streamId.toString(), amount: amount.toString() });
        console.log(`✅ Withdrawal recorded for stream ${streamId}`);

      } catch (error) {
        console.error('❌ Error processing Withdrawn:', error);
      }
    });

    // === STREAM PAUSE/RESUME/CANCEL EVENTS ===
    contract.on('StreamPaused', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId] = args.slice(0, -1);
        console.log(`📍 StreamPaused event: streamId=${streamId}`);

        await getPrisma().payment.update({
          where: { paymentId: parseInt(streamId.toString()) },
          data: { paused: true, pausedAt: BigInt(Math.floor(Date.now() / 1000)) },
        });

        await logContractEvent('StreamPaused', event.blockNumber, event.transactionHash, { streamId: streamId.toString() });
        console.log(`✅ Stream ${streamId} marked as paused`);
      } catch (error) {
        console.error('❌ Error processing StreamPaused:', error);
      }
    });

    contract.on('StreamResumed', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId] = args.slice(0, -1);
        console.log(`📍 StreamResumed event: streamId=${streamId}`);

        await getPrisma().payment.update({
          where: { paymentId: parseInt(streamId.toString()) },
          data: { paused: false, pausedAt: 0n },
        });

        await logContractEvent('StreamResumed', event.blockNumber, event.transactionHash, { streamId: streamId.toString() });
        console.log(`✅ Stream ${streamId} marked as resumed`);
      } catch (error) {
        console.error('❌ Error processing StreamResumed:', error);
      }
    });

    contract.on('StreamCancelled', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId, by, refunded] = args.slice(0, -1);
        console.log(`📍 StreamCancelled event: streamId=${streamId}`);

        await getPrisma().payment.update({
          where: { paymentId: parseInt(streamId.toString()) },
          data: { cancelled: true },
        });

        await logContractEvent('StreamCancelled', event.blockNumber, event.transactionHash, {
          streamId: streamId.toString(),
          cancelledBy: by,
          refunded: refunded.toString()
        });
        console.log(`✅ Stream ${streamId} marked as cancelled`);
      } catch (error) {
        console.error('❌ Error processing StreamCancelled:', error);
      }
    });

    // === MILESTONE EVENTS ===
    contract.on('MilestoneSubmitted', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [milestoneId, streamId, employee, amount, descriptionHash] = args.slice(0, -1);
        console.log(`📍 MilestoneSubmitted event: milestoneId=${milestoneId}`);

        await getPrisma().escrow.create({
          data: {
            escrowId: parseInt(milestoneId.toString()),
            paymentId: parseInt(streamId.toString()),
            company: "", // Will be filled from stream data
            employee: employee.toLowerCase(),
            token: "", // Will be filled from stream data
            amount: amount.toString(),
            description: descriptionHash,
            status: 'PENDING',
          },
        });

        await upsertUser(employee.toLowerCase(), { isEmployee: true });
        await logContractEvent('MilestoneSubmitted', event.blockNumber, event.transactionHash, {
          milestoneId: milestoneId.toString(),
          streamId: streamId.toString(),
          amount: amount.toString()
        });
        console.log(`✅ Milestone ${milestoneId} submitted`);
      } catch (error) {
        console.error('❌ Error processing MilestoneSubmitted:', error);
      }
    });

    contract.on('MilestoneApproved', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [milestoneId, auditor] = args.slice(0, -1);
        console.log(`📍 MilestoneApproved event: milestoneId=${milestoneId}`);

        await getPrisma().escrow.update({
          where: { escrowId: parseInt(milestoneId.toString()) },
          data: { status: 'APPROVED', approvedAt: new Date() },
        });

        await upsertUser(auditor.toLowerCase(), { isAuditor: true });
        await logContractEvent('MilestoneApproved', event.blockNumber, event.transactionHash, {
          milestoneId: milestoneId.toString(),
          auditor
        });
        console.log(`✅ Milestone ${milestoneId} approved by ${auditor}`);
      } catch (error) {
        console.error('❌ Error processing MilestoneApproved:', error);
      }
    });

    contract.on('MilestoneRejected', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [milestoneId, auditor] = args.slice(0, -1);
        console.log(`📍 MilestoneRejected event: milestoneId=${milestoneId}`);

        await getPrisma().escrow.update({
          where: { escrowId: parseInt(milestoneId.toString()) },
          data: { status: 'REJECTED' },
        });

        await upsertUser(auditor.toLowerCase(), { isAuditor: true });
        await logContractEvent('MilestoneRejected', event.blockNumber, event.transactionHash, {
          milestoneId: milestoneId.toString(),
          auditor
        });
        console.log(`✅ Milestone ${milestoneId} rejected by ${auditor}`);
      } catch (error) {
        console.error('❌ Error processing MilestoneRejected:', error);
      }
    });

    contract.on('MilestoneClaimed', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [milestoneId, employee, amount] = args.slice(0, -1);
        console.log(`📍 MilestoneClaimed event: milestoneId=${milestoneId}`);

        await getPrisma().escrow.update({
          where: { escrowId: parseInt(milestoneId.toString()) },
          data: { status: 'CLAIMED', claimedAt: new Date() },
        });

        await logContractEvent('MilestoneClaimed', event.blockNumber, event.transactionHash, {
          milestoneId: milestoneId.toString(),
          amount: amount.toString()
        });
        console.log(`✅ Milestone ${milestoneId} claimed for amount ${amount}`);
      } catch (error) {
        console.error('❌ Error processing MilestoneClaimed:', error);
      }
    });

    // === AUDITOR MANAGEMENT EVENTS ===
    contract.on('StreamAuditorAdded', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [streamId, auditor] = args.slice(0, -1);
        console.log(`📍 StreamAuditorAdded event: streamId=${streamId}, auditor=${auditor}`);
        await upsertUser(auditor.toLowerCase(), { isAuditor: true });
        await logContractEvent('StreamAuditorAdded', event.blockNumber, event.transactionHash, { streamId: streamId.toString(), auditor });
        console.log(`✅ Auditor ${auditor} added to stream ${streamId}`);
      } catch (error) {
        console.error('❌ Error processing StreamAuditorAdded:', error);
      }
    });
    
    console.log('✅ Contract event listener started successfully');
  } catch (error) {
    console.error('Failed to start contract listener:', error);
  }
}

async function upsertUser(wallet: string, roles: { isCompany?: boolean; isEmployee?: boolean; isAuditor?: boolean }) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { wallet } });

  if (user) {
    await prisma.user.update({
      where: { wallet },
      data: {
        isCompany: roles.isCompany || user.isCompany,
        isEmployee: roles.isEmployee || user.isEmployee,
        isAuditor: roles.isAuditor || user.isAuditor,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        wallet,
        isCompany: roles.isCompany || false,
        isEmployee: roles.isEmployee || false,
        isAuditor: roles.isAuditor || false,
      },
    });
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
    });
  } catch (error) {
    console.error(`Error logging ${eventName} event:`, error);
  }
}