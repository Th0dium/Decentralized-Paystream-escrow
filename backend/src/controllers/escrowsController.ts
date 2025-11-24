import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middleware/auth'

let prisma: PrismaClient

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export const getEmployeeEscrows = async (req: AuthRequest, res: Response) => {
  try {
    const { walletAddress } = req.params

    const escrows = await getPrisma().escrow.findMany({
      where: {
        employee: walletAddress.toLowerCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: escrows,
    })
  } catch (error) {
    console.error('Error fetching employee escrows:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrows',
    })
  }
}

export const getPendingEscrows = async (req: AuthRequest, res: Response) => {
  try {
    // In a real app, you'd also check if the authenticated user is the auditor
    const escrows = await getPrisma().escrow.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json({
      success: true,
      data: escrows,
    })
  } catch (error) {
    console.error('Error fetching pending escrows:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrows',
    })
  }
}

export const getEscrowDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { escrowId } = req.params

    const escrow = await getPrisma().escrow.findUnique({
      where: { escrowId: parseInt(escrowId) },
      include: {
        payment: true,
      },
    })

    if (!escrow) {
      return res.status(404).json({
        success: false,
        error: 'Escrow not found',
      })
    }

    res.json({
      success: true,
      data: escrow,
    })
  } catch (error) {
    console.error('Error fetching escrow details:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch escrow' })
  }
}