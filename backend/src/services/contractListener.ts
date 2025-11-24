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
    "event PaymentCreated(uint256 indexed paymentId, address indexed company, address indexed employee, address token, uint256 totalAmount, uint64 startTime, uint64 stopTime, uint256 feeAmount)",
    "event PaymentWithdrawn(uint256 indexed paymentId, address indexed employee, uint256 amount)",
    "event PaymentPaused(uint256 indexed paymentId, address indexed by)",
    "event PaymentResumed(uint256 indexed paymentId, address indexed by)",
    "event PaymentCancelled(uint256 indexed paymentId, address indexed by, uint256 refunded)",
    "event EscrowCreated(uint256 escrowId, uint256 indexed paymentId, address indexed company, address indexed employee, address token, uint256 amount, string description)",
    "event EscrowApproved(uint256 indexed escrowId, address indexed auditor)",
    "event EscrowRejected(uint256 indexed escrowId, address indexed auditor)",
    "event EscrowClaimed(uint256 indexed escrowId, address indexed employee, uint256 amount)",
    "event EscrowCancelled(uint256 indexed escrowId, address indexed company, uint256 refunded)",
    "event PaymentAuditorAdded(uint256 indexed paymentId, address indexed auditor)",
    "event EscrowAuditorAdded(uint256 indexed escrowId, address indexed auditor)"
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

    contract.on('PaymentCreated', async (...args) => {
      try {
        const event = args[args.length - 1];
        const [paymentId, company, employee, token, totalAmount, startTime, stopTime] = args.slice(0, -1);

        console.log(`📍 PaymentCreated event: paymentId=${paymentId}`);

        await getPrisma().payment.create({
          data: {
            paymentId: parseInt(paymentId),
            company: company.toLowerCase(),
            employee: employee.toLowerCase(),
            token: token.toLowerCase(),
            totalAmount: totalAmount.toString(),
            startTime: BigInt(startTime),
            stopTime: BigInt(stopTime),
          },
        });
        
        // Update user roles
        await upsertUser(company.toLowerCase(), { isCompany: true });
        await upsertUser(employee.toLowerCase(), { isEmployee: true });

        await logContractEvent('PaymentCreated', event.blockNumber, event.transactionHash, { paymentId, company, employee });
        console.log(`✅ Payment ${paymentId} saved, roles updated`);

      } catch (error) {
        console.error('Error processing PaymentCreated:', error);
      }
    });

    contract.on('EscrowCreated', async (...args) => {
        try {
            const event = args[args.length - 1];
            const [escrowId, paymentId, company, employee, token, amount, description] = args.slice(0, -1);

            console.log(`📍 EscrowCreated event: escrowId=${escrowId}`);

            await getPrisma().escrow.create({
                data: {
                    escrowId: parseInt(escrowId),
                    paymentId: paymentId > 0 ? parseInt(paymentId) : null,
                    company: company.toLowerCase(),
                    employee: employee.toLowerCase(),
                    token: token.toLowerCase(),
                    amount: amount.toString(),
                    description: description,
                    status: 'PENDING',
                },
            });

            await upsertUser(company.toLowerCase(), { isCompany: true });
            await upsertUser(employee.toLowerCase(), { isEmployee: true });

            await logContractEvent('EscrowCreated', event.blockNumber, event.transactionHash, { escrowId, company, employee });
            console.log(`✅ Escrow ${escrowId} saved, roles updated.`);

        } catch (error) {
            console.error('Error processing EscrowCreated:', error);
        }
    });

    contract.on('PaymentAuditorAdded', async (...args) => {
        const event = args[args.length - 1];
        const [paymentId, auditor] = args.slice(0, -1);
        console.log(`📍 PaymentAuditorAdded event: paymentId=${paymentId}, auditor=${auditor}`);
        await upsertUser(auditor.toLowerCase(), { isAuditor: true });
        await logContractEvent('PaymentAuditorAdded', event.blockNumber, event.transactionHash, { paymentId, auditor });
        console.log(`✅ Auditor ${auditor} for payment ${paymentId} saved, role updated.`);
    });

    contract.on('EscrowAuditorAdded', async (...args) => {
        const event = args[args.length - 1];
        const [escrowId, auditor] = args.slice(0, -1);
        console.log(`📍 EscrowAuditorAdded event: escrowId=${escrowId}, auditor=${auditor}`);
        await upsertUser(auditor.toLowerCase(), { isAuditor: true });
        await logContractEvent('EscrowAuditorAdded', event.blockNumber, event.transactionHash, { escrowId, auditor });
        console.log(`✅ Auditor ${auditor} for escrow ${escrowId} saved, role updated.`);
    });

    // ... other event listeners
    
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